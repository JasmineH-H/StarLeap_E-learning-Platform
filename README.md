# StarLeap

StarLeap is a gamified learning platform with a React frontend and an Express/MongoDB backend. It supports student learning flows, instructor progress management, and admin assignment tools, with quizzes, progress tracking, and a crystal-based rewards shop.

## Key Features

- Student authentication with JWT access and refresh tokens stored in cookies.
- Course browsing, module progression, and learning materials delivery.
- Quiz-based learning flow with chapter intro screens, image-based questions, and crystal rewards.
- Progress tracking for individual students and instructor-visible course progress.
- Crystal collection and redemption in the in-app shop.
- Instructor tools for viewing and updating student course access and progress.
- Admin tools for instructor/student management and assignment workflows.
- MongoDB collection export/import via JSON dumps for local data sharing and backups.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- SimpleBar
- React PDF Viewer

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Cookie-based sessions
- Multer and Multer S3 for uploads
- AWS S3 for file storage
- SendGrid for email delivery
- Sharp for image processing

## Project Structure

- [Backend/](Backend/) - Express API, database models, controllers, and upload services.
- [Frontend/](Frontend/) - React application with routes, pages, components, and shared contexts.
- [Backend/db-dump-json/](Backend/db-dump-json/) - MongoDB collection exports in JSON format.

## Getting Started

Install dependencies separately in each app folder:

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

Run the backend:

```bash
cd Backend
npm run dev
```

Run the frontend:

```bash
cd Frontend
npm run dev
```

## Database Import and Export

The backend includes scripts for moving MongoDB data in and out of the JSON dump directory:

```bash
cd Backend
npm run db:export
npm run db:import
```

By default, the backend scripts use `mongodb://localhost:27017` and the `starleap` database. You can override the target with `MONGO_URI` and `MONGO_DB`.

## Notes

- The backend API runs on port `3000` by default.
- The frontend Vite dev server runs on port `5173` by default.
- The frontend expects the backend at `http://localhost:3000` during local development.
