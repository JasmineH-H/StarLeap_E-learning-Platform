export interface question {
  text: string;
  options: [{text: string, isCorrect: boolean, _id: string}];
}
export interface QuizQuestion {
  updatedAt: string;
  createdAt: string;
  _id: string;
  questions: question[];
}