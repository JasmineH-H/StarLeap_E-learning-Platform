import mongoose from "mongoose";
import { Quiz } from "./quiz.js";

async function run() {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/starleapauth",
  );

  const quiz = new Quiz({
    courseId: new mongoose.Types.ObjectId("6912adcf0cceb3d617e5d0c4"),
    moduleId: new mongoose.Types.ObjectId("6912b0480cceb3d617e5d0ca"),
    questions: [
      {
        text: "What is 2+2?",
        options: [
          { text: "3", isCorrect: false },
          { text: "4", isCorrect: true },
          { text: "5", isCorrect: false },
        ],
      },
      {
        text: "which is appropriate greeting in the morning?",
        options: [
          { text: "Good night", isCorrect: false },
          { text: "Good morning", isCorrect: true },
          { text: "Goodbye", isCorrect: false },
          { text: "See you later", isCorrect: false },
        ],
      },
      // more questions...
    ],
  });

  await quiz.save();
  console.log("Quiz saved:", quiz._id);
  await mongoose.disconnect();
}
run().catch((err) => {
  console.error("Error running script:", err);
  mongoose.disconnect();
});
