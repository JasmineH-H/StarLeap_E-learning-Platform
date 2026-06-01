import { Course, Material, Progress, Enrollment, User } from '../models/index.js';
import s3Service from '../services/s3Service.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Quiz } from '../models/quiz.js';

// helper: convert a stored relative URL (e.g. "/uploads/...") to an absolute URL using the incoming request
const toFullUrl = (req, relativePath) => {
    if (!relativePath) return null;
    if (/^https?:\/\//i.test(relativePath)) return relativePath; // already absolute
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    return `${proto}://${req.get('host')}${relativePath}`;
};

// Helper function to determine file type
const getFileType = (mimeType) => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('doc')) return mimeType.includes('wordprocessingml') ? 'docx' : 'doc';
    if (mimeType.includes('text')) return 'txt';
    return 'other';
};

class CourseController {

    /**
     * Create a new course
     */
    async createCourse(req, res) {
        try {
            const { title, description, difficulty, modules } = req.body;


            const course = new Course({
                title,
                description,
                difficulty,
                modules: modules || []
            });

            await course.save();

            // Auto-enroll all existing students (locked by default)
            const students = await User.find({ role: 'student' }, '_id');
            if (students.length) {
                const bulk = students.map((s) => ({
                    updateOne: {
                        filter: { userId: s._id, courseId: course._id },
                        update: { userId: s._id, courseId: course._id, isOpen: false },
                        upsert: true
                    }
                }));
                await Enrollment.bulkWrite(bulk);

                // progress docs
                const progressBulk = [];
                for (const s of students) {
                    for (const m of course.modules) {
                        progressBulk.push({
                            updateOne: {
                                filter: { userId: s._id, moduleId: m._id },
                                update: { userId: s._id, courseId: course._id, moduleId: m._id, stars: 0 },
                                upsert: true
                            }
                        });
                    }
                }
                if (progressBulk.length) {
                    await Progress.bulkWrite(progressBulk);
                }
            }


            res.status(201).json({
                success: true,
                message: 'Course created successfully',
                data: course
            });

        } catch (error) {
            console.error('Create Course Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create course',
                error: error.message
            });
        }
    }

    /**
     * Get all courses with pagination
     */
    async getAllCourses(req, res) {
        try {
            const { page = 1, limit = 10, difficulty, isActive, search } = req.query;
            const skip = (page - 1) * limit;

            // Build filter object
            const filter = {};
            if (difficulty) filter.difficulty = difficulty;
            if (isActive !== undefined) filter.isActive = isActive === 'true';
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            const courses = await Course.find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const total = await Course.countDocuments(filter);

            res.json({
                success: true,
                data: {
                    courses,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalCourses: total,
                        hasNextPage: page * limit < total,
                        hasPrevPage: page > 1
                    }
                }
            });

        } catch (error) {
            console.error('Get Courses Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve courses',
                error: error.message
            });
        }
    }

    /**
     * Get single course by ID
     */
    async getCourseById(req, res) {
        try {
            const { courseId } = req.params;

            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }



            res.json({
                success: true,
                data: {
                    course,

                }
            });

        } catch (error) {
            console.error('Get Course Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve course',
                error: error.message
            });
        }
    }

    /**
     * Update course
     */
    async updateCourse(req, res) {
        try {
            const { courseId } = req.params;
            const updateData = req.body;

            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }

            const updatedCourse = await Course.findByIdAndUpdate(
                courseId,
                updateData,
                { new: true, runValidators: true }
            );

            res.json({
                success: true,
                message: 'Course updated successfully',
                data: updatedCourse
            });

        } catch (error) {
            console.error('Update Course Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update course',
                error: error.message
            });
        }
    }

    /**
     * Delete course
     */
    async deleteCourse(req, res) {
        try {
            const { courseId } = req.params;

            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }



            // Delete associated materials from storage (S3 or local)
            const materials = await Material.find({ courseId });
            for (const material of materials) {
                try {
                    if (material.storageType === 's3' && material.cloudKey) {
                        await s3Service.deleteFile(material.cloudKey);
                    } else if (material.storageType === 'local' && material.url) {
                        const filePath = path.join(process.cwd(), material.url.replace(/^\//, ''));
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }
                } catch (err) {
                    console.error('Failed to delete material from storage during course deletion:', err);
                }
            }

            // Delete materials from database
            await Material.deleteMany({ courseId });

            // Delete progress records
            await Progress.deleteMany({ courseId });

            // Delete enrollments
            await Enrollment.deleteMany({ courseId });

            // Delete course
            await Course.findByIdAndDelete(courseId);

            res.json({
                success: true,
                message: 'Course deleted successfully'
            });

        } catch (error) {
            console.error('Delete Course Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete course',
                error: error.message
            });
        }
    }

    /**
     * Upload course material
     */
    async uploadMaterial(req, res) {
        try {
            const { courseId, moduleId } = req.params;
            const files = req.files;
            console.log("I am here");
            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }

            const uploadedMaterials = [];

            for (const file of files) {
                // Two possible flows:
                // 1) File data is in memory (file.buffer) -> upload to S3 if enabled
                // 2) File was saved to disk by middleware -> file.path or req.savedFilePath available -> keep local

                if (file && file.buffer && USE_S3) {
                    // Upload to S3 using our service
                    const uploadResult = await s3Service.uploadFile(
                        file.buffer,
                        file.originalname,
                        file.mimetype,
                        courseId,
                        moduleId
                    );

                    // Create material record in database (S3)
                    const material = new Material({
                        filename: file.originalname,
                        type: getFileType(file.mimetype),
                        storageType: 's3',
                        url: uploadResult.url,
                        cloudKey: uploadResult.key,
                        courseId: courseId
                    });

                    await material.save();
                    uploadedMaterials.push(material);
                } else {
                    // Local disk flow: prefer req.savedFilePath (set by disk storage middleware), fallback to file.path
                    const relativePath = (req.savedFilePath) ? req.savedFilePath : (file.path ? path.relative(process.cwd(), file.path) : null);
                    const urlPath = relativePath ? `/${relativePath.replace(/\\/g, '/')}` : null;
                    console.log('Local file saved at URL path:', urlPath);
                    const material = new Material({
                        filename: file.originalname,
                        type: getFileType(file.mimetype || ''),
                        storageType: 'local',
                        url: urlPath || '',
                        cloudKey: null,
                        courseId: courseId
                    });

                    await material.save();
                    uploadedMaterials.push(material);
                }
            }

            res.status(201).json({
                success: true,
                message: `${uploadedMaterials.length} file(s) uploaded successfully`,
                data: uploadedMaterials
            });

        } catch (error) {
            console.error('Upload Material Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload materials',
                error: error.message
            });
        }
    }

    /**
     * Get material with signed URL for secure access
     */
    async getMaterial(req, res) {
        try {
            const { materialId } = req.params;

            const material = await Material.findById(materialId);

            if (!material) {
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
                });
            }

            // Return the backend download endpoint so clients always fetch
            // the material via our server which will handle S3 redirect or
            // local-file streaming. This centralizes access control.
            const downloadPath = `/api/courses/materials/${materialId}/download`;
            const secureUrl = toFullUrl(req, downloadPath);

            res.json({
                success: true,
                data: {
                    material: {
                        ...material.toObject(),
                        secureUrl
                    }
                }
            });

        } catch (error) {
            console.error('Get Material Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve material',
                error: error.message
            });
        }
    }

    /**
     * Download material file (redirect to S3 signed URL or send local file)
     */
    async downloadMaterial(req, res) {
        try {
            const { materialId } = req.params;

            const material = await Material.findById(materialId);

            if (!material) {
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
                });
            }

            // If stored in S3 and we're using S3, redirect to a signed URL
            if (material.storageType === 's3' && material.cloudKey && USE_S3) {
                try {
                    const signedUrl = await s3Service.getSignedUrl(material.cloudKey);
                    return res.redirect(signedUrl);
                } catch (err) {
                    console.error('Failed to get signed URL for material:', err);
                    return res.status(500).json({ success: false, message: 'Failed to retrieve material' });
                }
            }

            // Otherwise serve local file from uploads
            if (material.storageType === 'local' && material.url) {
                const filePath = path.join(process.cwd(), material.url.replace(/^\//, ''));
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ success: false, message: 'Material file not found on server' });
                }

                const filename = material.filename || path.basename(filePath);
                return res.download(filePath, filename, (err) => {
                    if (err) {
                        console.error('Error sending material file:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ success: false, message: 'Failed to send material' });
                        }
                    }
                });
            }

            return res.status(400).json({ success: false, message: 'Material not available for download' });
        } catch (error) {
            console.error('Download Material Error:', error);
            res.status(500).json({ success: false, message: 'Failed to download material', error: error.message });
        }
    }

    /**
     * Delete material
     */
    async deleteMaterial(req, res) {
        try {
            const { materialId } = req.params;

            const material = await Material.findById(materialId);

            if (!material) {
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
                });
            }

            // Find all courses that reference this material and remove the reference
            const courses = await Course.find({
                'modules.materials.materialId': materialId
            });

            let removedFromModules = 0;
            let updatedCourses = [];

            for (const course of courses) {
                let courseModified = false;

                for (const module of course.modules) {
                    const initialLength = module.materials.length;
                    module.materials = module.materials.filter(
                        material => material.materialId.toString() !== materialId
                    );

                    if (module.materials.length !== initialLength) {
                        courseModified = true;
                        removedFromModules += (initialLength - module.materials.length);
                    }
                }

                if (courseModified) {
                    await course.save();
                    updatedCourses.push(course._id);
                }
            }

            // Delete from storage
            try {
                if (material.storageType === 's3' && material.cloudKey) {
                    await s3Service.deleteFile(material.cloudKey);
                } else if (material.storageType === 'local' && material.url) {
                    // material.url is stored as a relative path like '/uploads/...'
                    const filePath = path.join(process.cwd(), material.url.replace(/^\//, ''));
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            } catch (err) {
                console.error('Failed to delete material from storage:', err);
                // Continue with database deletion
            }

            // Delete from database
            await Material.findByIdAndDelete(materialId);

            res.json({
                success: true,
                message: 'Material deleted successfully',
                data: {
                    materialId,
                    removedFromModules,
                    updatedCourses: updatedCourses.length,
                    courseIds: updatedCourses
                }
            });

        } catch (error) {
            console.error('Delete Material Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete material',
                error: error.message
            });
        }
    }

    /**
     * Add or update course modules
     */
    async updateModules(req, res) {
        try {
            const { courseId } = req.params;
            const { modules } = req.body;

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }

            // Process modules to handle temporary IDs
            const processedModules = modules.map(module => {
                // If _id exists but is not a valid ObjectId, remove it so MongoDB generates a new one
                if (module._id && !mongoose.Types.ObjectId.isValid(module._id)) {
                    const { _id, ...moduleWithoutId } = module;
                    return moduleWithoutId;
                }
                return module;
            });

            // Get old module IDs for comparison (only valid ObjectIds)
            const oldModuleIds = course.modules.map(module => module._id.toString());
            const newModuleIds = processedModules
                .map(module => module._id)
                .filter(id => id && mongoose.Types.ObjectId.isValid(id));

            // Find deleted modules (modules that exist in old but not in new)
            const deletedModuleIds = oldModuleIds.filter(oldId => !newModuleIds.includes(oldId));

            // If there are deleted modules, find and delete their associated materials
            if (deletedModuleIds.length > 0) {
                // Get all material IDs from deleted modules
                const materialsToDelete = [];
                course.modules.forEach(module => {
                    if (deletedModuleIds.includes(module._id.toString())) {
                        module.materials.forEach(material => {
                            materialsToDelete.push(material.materialId);
                        });
                    }
                });

                // Delete materials from S3 and database
                if (materialsToDelete.length > 0) {
                    // Get material details for S3 deletion
                    const materials = await Material.find({ _id: { $in: materialsToDelete } });

                    // Delete from storage (S3 or local)
                    for (const material of materials) {
                        try {
                            if (material.storageType === 's3' && material.cloudKey) {
                                await s3Service.deleteFile(material.cloudKey);
                            } else if (material.storageType === 'local' && material.url) {
                                const filePath = path.join(process.cwd(), material.url.replace(/^\//, ''));
                                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                            }
                        } catch (s3Error) {
                            console.error('Failed to delete material from storage:', s3Error);
                            // Continue with database deletion even if storage deletion fails
                        }
                    }

                    // Delete from database
                    await Material.deleteMany({ _id: { $in: materialsToDelete } });
                }
            }

            // Update modules with processed data
            course.modules = processedModules;
            await course.save();

            res.json({
                success: true,
                message: 'Modules updated successfully',
                data: course,
                deletedModules: deletedModuleIds.length > 0 ? deletedModuleIds.length : 0
            });

        } catch (error) {
            console.error('Update Modules Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update modules',
                error: error.message
            });
        }
    }

    /**
     * Get upload presigned URL for direct client uploads
     */
    async getUploadUrl(req, res) {
        try {
            const { courseId, moduleId } = req.params;
            const { fileName, fileType } = req.body;

            if (!fileName || !fileType) {
                return res.status(400).json({
                    success: false,
                    message: 'fileName and fileType are required'
                });
            }

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }

            const uploadData = await s3Service.getUploadPresignedUrl(
                fileName,
                fileType,
                courseId,
                moduleId
            );

            res.json({
                success: true,
                data: uploadData
            });

        } catch (error) {
            console.error('Get Upload URL Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate upload URL',
                error: error.message
            });
        }
    }

    /**
     * Upload course thumbnail
     */
    async uploadThumbnail(req, res) {
        try {
            const { courseId } = req.params;
            const file = req.file; // Single file for thumbnail

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No thumbnail file uploaded'
                });
            }

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }

            // Delete old thumbnail if exists
            try {
                if (course.thumbnail?.cloudKey) {
                    await s3Service.deleteFile(course.thumbnail.cloudKey);
                } else if (course.thumbnail?.url) {
                    const oldPath = path.join(process.cwd(), course.thumbnail.url.replace(/^\//, ''));
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            } catch (err) {
                console.error('Failed to delete previous thumbnail:', err);
            }

            // Upload new thumbnail either to S3 (if enabled and buffer available) or keep local path
            if (file && file.buffer && USE_S3) {
                const uploadResult = await s3Service.uploadFile(
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                    courseId,
                    'thumbnail'
                );

                // Update course with thumbnail info (S3)
                course.thumbnail = {
                    url: uploadResult.url,
                    cloudKey: uploadResult.key,
                    filename: file.originalname
                };
            } else {
                // Local thumbnail saved by middleware
                const relativePath = req.savedFilePath ? req.savedFilePath : (file.path ? path.relative(process.cwd(), file.path) : null);
                const urlPath = relativePath ? `/${relativePath.replace(/\\/g, '/')}` : null;

                course.thumbnail = {
                    url: urlPath,
                    cloudKey: null,
                    filename: file.originalname
                };
            }

            await course.save();

            res.json({
                success: true,
                message: 'Thumbnail uploaded successfully',
                data: {
                    courseId: courseId,
                    thumbnail: course.thumbnail
                }
            });

        } catch (error) {
            console.error('Upload Thumbnail Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload thumbnail',
                error: error.message
            });
        }
    }

    async uploadQuizQuestionImage(req, res) {
        try {
            const file = req.file; // Single file for quiz question image
            const { quizId, questionId } = req.params;
            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    message: 'Quiz not found'
                });
            }
            const question = quiz.questions.id(questionId);
            if (!question) {
                return res.status(404).json({
                    success: false,
                    message: 'Question not found'
                });
            }
            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file uploaded'
                });
            }
            const relativePath = req.savedFilePath ? req.savedFilePath : (file.path ? path.relative(process.cwd(), file.path) : null);
            const urlPath = relativePath ? `/${relativePath.replace(/\\/g, '/')}` : null;
            question.imageUri = urlPath;

            await quiz.save();
            res.json({
                success: true,
                message: 'Question image uploaded successfully',
            });
        } catch (error) {
            console.error('Upload Quiz Question Image Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload quiz question image',
                error: error.message
            });
        }
    }

    /**
     * Delete course thumbnail
     */
    async deleteThumbnail(req, res) {
        try {
            const { courseId } = req.params;

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }

            if (!course.thumbnail?.cloudKey && !course.thumbnail?.url) {
                return res.status(404).json({
                    success: false,
                    message: 'No thumbnail found for this course'
                });
            }

            // Delete from storage
            try {
                if (course.thumbnail?.cloudKey) {
                    await s3Service.deleteFile(course.thumbnail.cloudKey);
                } else if (course.thumbnail?.url) {
                    const filePath = path.join(process.cwd(), course.thumbnail.url.replace(/^\//, ''));
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            } catch (err) {
                console.error('Failed to delete thumbnail from storage:', err);
            }

            // Remove thumbnail from course
            course.thumbnail = {
                url: null,
                cloudKey: null,
                filename: null
            };

            await course.save();

            res.json({
                success: true,
                message: 'Thumbnail deleted successfully'
            });

        } catch (error) {
            console.error('Delete Thumbnail Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete thumbnail',
                error: error.message
            });
        }
    }

    /**
     * Get thumbnail with secure URL (if needed)
     */
    async getThumbnail(req, res) {
        try {
            const { courseId } = req.params;

            const course = await Course.findById(courseId);
            if (!course || (!course.thumbnail?.cloudKey && !course.thumbnail?.url)) {
                return res.status(404).json({
                    success: false,
                    message: 'No thumbnail found for this course'
                });
            }

            // Return the backend download endpoint so clients always fetch
            // the thumbnail via our server which will handle S3 redirect or
            // local-file streaming. This keeps access consistent.
            const downloadPath = `/api/courses/${courseId}/thumbnail-download`;
            const secureUrl = toFullUrl(req, downloadPath);

            res.json({
                success: true,
                data: {
                    thumbnail: {
                        ...course.thumbnail,
                        secureUrl
                    }
                }
            });

        } catch (error) {
            console.error('Get Thumbnail Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get thumbnail',
                error: error.message
            });
        }
    }

    /**
     * Download thumbnail file (redirect to S3 signed URL or send local file)
     */
    async downloadThumbnail(req, res) {
        try {
            const { courseId } = req.params;

            const course = await Course.findById(courseId);
            if (!course || (!course.thumbnail?.cloudKey && !course.thumbnail?.url)) {
                return res.status(404).json({
                    success: false,
                    message: 'No thumbnail found for this course'
                });
            }

            // If thumbnail stored in S3, get a signed URL and redirect to it
            if (course.thumbnail?.cloudKey && USE_S3) {
                try {
                    const signedUrl = await s3Service.getSignedUrl(course.thumbnail.cloudKey);
                    return res.redirect(signedUrl);
                } catch (err) {
                    console.error('Failed to get signed URL for thumbnail:', err);
                    return res.status(500).json({ success: false, message: 'Failed to retrieve thumbnail' });
                }
            }

            // Otherwise serve local file from uploads
            if (course.thumbnail?.url) {
                const filePath = path.join(process.cwd(), course.thumbnail.url.replace(/^\//, ''));
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ success: false, message: 'Thumbnail file not found on server' });
                }

                const filename = course.thumbnail.filename || path.basename(filePath);
                return res.download(filePath, filename, (err) => {
                    if (err) {
                        console.error('Error sending thumbnail file:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ success: false, message: 'Failed to send thumbnail' });
                        }
                    }
                });
            }

            return res.status(400).json({ success: false, message: 'Thumbnail not available' });
        } catch (error) {
            console.error('Download Thumbnail Error:', error);
            res.status(500).json({ success: false, message: 'Failed to download thumbnail', error: error.message });
        }
    }


    async getAllMaterialsHandler(req, res) {
        try {
            const materials = await Material.find().lean();
            // const course = await Course.findById('6912adcf0cceb3d617e5d0c4');
            // const module = course.modules.id('6912b0480cceb3d617e5d0ca');
            // module.materials.push({materialId: new mongoose.Types.ObjectId('6913a620c2d0c36bbcb91ac6')});
            // module.materials.push({materialId: new mongoose.Types.ObjectId('6913add7c2d0c36bbcb91ae6')});
            // await course.save();
            // const materialIds = ['6913a620c2d0c36bbcb91ac6', '6913add7c2d0c36bbcb91ae6'];

            // // load Material docs
            // const materials2 = await Material.find({ _id: { $in: materialIds } }).lean();

            // // create the subdocuments expected by your Course schema
            // module.materials = materials2.map((m, idx) => ({
            //     materialId: new mongoose.Types.ObjectId(m._id),
            //     name: m.filename || m.originalname || 'unnamed',
            //     type: m.type || getFileType(m.mimetype || ''),
            //     order: typeof m.order === 'number' ? m.order : idx
            // }));

            // await course.save();
            return res.json({ success: true, data: materials });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}

export default new CourseController();

//6913a620c2d0c36bbcb91ac6
//6913add7c2d0c36bbcb91ae6

// module 6912b0480cceb3d617e5d0ca
// course 6912adcf0cceb3d617e5d0c4