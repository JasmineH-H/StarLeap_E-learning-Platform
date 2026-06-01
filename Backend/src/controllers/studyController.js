import { Enrollment, User } from "../models/index.js";
import { Course } from "../models/course.js";
import Progress from "../models/progress.js";
import { Quiz } from "../models/quiz.js";
import CrystalInfo from "../models/crystalInfo.js";

import fs from "fs";
import path from "path";

class studyController {
  async getCourses(req, res) {
    try {
      const { userId, courseId } = req.params;

      const student = await User.findById(userId);
      if (!student || student.role !== "student") {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }

      const enrollemnts = await Enrollment.find({ userId }).populate(
        "courseId",
        "_id"
      );
      const coursesWithProgress = await Promise.all(
        enrollemnts.map(async (enrollment) => {
          const courseId = enrollment.courseId._id;

          const course = await Course.findById(courseId).select(
            "title description thumbnail modules"
          );

          const progressDocs = await Progress.find({ userId, courseId }).select(
            "moduleId stars isOpen"
          );

          const progressMap = new Map();
          progressDocs.forEach((p) => {
            progressMap.set(p.moduleId.toString(), {
              stars: p.stars,
              isOpen: p.isOpen,
            });
          });

          const modulesWithProgress = course.modules.map((mod) => {
            const modObj = mod.toObject();
            modObj.crystals = mod.crystals ?? 0;
            const progressEntry = progressMap.get(mod._id.toString());
            modObj.stars = progressEntry?.stars ?? 1;
            modObj.isOpen = progressEntry?.isOpen ?? true;
            return modObj;
          });

          const enrollmentObj = enrollment.toObject();
          enrollmentObj.courseData = {
            _id: course._id,
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            isOpen: enrollment.isOpen,
            modules: modulesWithProgress,
          };
          delete enrollmentObj.courseId;

          return enrollmentObj;
        })
      );
      res.json({ success: true, data: coursesWithProgress });
    } catch (error) {
      console.error("Get Student Courses Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get study courses",
        error: error.message,
      });
    }
  }

  async getQuiz(req, res) {
    try {
      const { courseId, moduleId } = req.params;

      const quiz = await Quiz.findOne({ courseId, moduleId });
      if (!quiz) {
        return res
          .status(404)
          .json({ success: false, message: "Quiz not found" });
      }

      res.json({ success: true, data: quiz });
    } catch (error) {
      console.error("Get Quiz Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get quiz",
        error: error.message,
      });
    }
  }
  async downloadQuizQuestionImage(req, res) {
    try {
      const { quizId, questionId } = req.params;
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found",
        });
      }
      const question = quiz.questions.id(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }
      console.log("Question image URI:", question.imageUri);
      if (!question.imageUri) {
        return res.status(404).json({
          success: false,
          message: "No image found for this question",
        });
      }
      const filePath = path.join(
        process.cwd(),
        question.imageUri.replace(/^\//, "")
      );
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: "Question image file not found on server",
        });
      }
      const filename = path.basename(filePath);
      return res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending question image file:", err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: "Failed to send question image",
            });
          }
        }
      });
    } catch (error) {
      console.error("Download Quiz Question Image Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to download question image",
        error: error.message,
      });
    }
  }
  async submitQuiz(req, res) {
    try {
      const { userId, quizId } = req.params;

      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res
          .status(404)
          .json({ success: false, message: "Quiz not found" });
      }
      const moduleId = quiz.moduleId;

      // ----------------------------------------
      // UPDATE MODULE CRYSTALS AND UNLOCK NEXT
      // ----------------------------------------
      const course = await Course.findById(quiz.courseId);
      if (course) {
        const module = course.modules.id(moduleId);

        if (module) {
          // Update crystals (always 3 for now)
          module.crystals = Math.max(module.crystals || 0, 3);

          // Unlock next module
          const nextModule = course.modules.find(
            (m) => m.order === module.order + 1
          );
          if (nextModule) {
            nextModule.isModuleOpen = true;
          }

          await course.save();
        }
      }

      const userCrystalData = await CrystalInfo.findOne({ userId });
      if (!userCrystalData) {
        const newRecord = { userId, crystal: 3, moduleCompleted: [moduleId] };
        await CrystalInfo.create(newRecord);
      } else {
        if (!userCrystalData.moduleCompleted.includes(moduleId)) {
          userCrystalData.crystal += 3;
          userCrystalData.moduleCompleted.push(moduleId);
          await userCrystalData.save();
        }
      }

      res.json({ success: true, message: "Quiz submitted successfully" });
    } catch (error) {
      console.error("Submit Quiz Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit quiz",
        error: error.message,
      });
    }
  }
  async getCrystalCount(req, res) {
    try {
      const { userId } = req.params;
      const userCrystalData = await CrystalInfo.findOne({ userId });
      const crystalCount = userCrystalData ? userCrystalData.crystal : 0;
      res.json({ success: true, count: crystalCount });
    } catch (error) {
      console.error("Get Crystal Count Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get crystal count",
        error: error.message,
      });
    }
  }

  async redeemItem(req, res) {
    try {
      const { userId } = req.params;
      const { price, itemId } = req.body;

      // find the user's crystal wallet
      const crystalInfo = await CrystalInfo.findOne({ userId });

      if (!crystalInfo) {
        return res.status(404).json({
          success: false,
          message: "Crystal info not found",
        });
      }

      // Check balance
      if (crystalInfo.totalCrystals < price) {
        return res.status(400).json({
          success: false,
          message: "Not enough crystals",
        });
      }

      // Deduct crystals
      crystalInfo.totalCrystals -= price;

      await crystalInfo.save();

      return res.json({
        success: true,
        message: "Redeemed successfully",
        newTotal: crystalInfo.totalCrystals,
      });
    } catch (err) {
      console.error("Redeem error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error while redeeming",
      });
    }
  }
}

export default new studyController();
