import React, { useState } from 'react';
import { Brain, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';

const LimeQuizApp = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const questions = [
    {
      question: "What is LimeOS?",
      options: ["A fruit-based operating system", "A React-based desktop simulation", "A mobile app", "A database system"],
      correct: 1,
      explanation: "LimeOS is a React-based operating system simulation with a green theme."
    },
    {
      question: "Which technology powers LimeOS?",
      options: ["Vue.js", "Angular", "React", "Svelte"],
      correct: 2,
      explanation: "LimeOS is built using React 18+ with modern hooks and components."
    },
    {
      question: "What is the primary color of LimeOS?",
      options: ["Blue", "Red", "Green", "Purple"],
      correct: 2,
      explanation: "LimeOS features a distinctive green (#00ff88) color scheme."
    },
    {
      question: "Which build tool does LimeOS use?",
      options: ["Webpack", "Parcel", "Vite", "Rollup"],
      correct: 2,
      explanation: "LimeOS uses Vite for fast development and optimized production builds."
    },
    {
      question: "What styling framework is used in LimeOS?",
      options: ["Bootstrap", "Material-UI", "Tailwind CSS", "Styled Components"],
      correct: 2,
      explanation: "LimeOS uses Tailwind CSS for utility-first styling with custom lime theme."
    }
  ];

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === questions[currentQuestion].correct) {
      setScore(score + 1);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setQuizCompleted(true);
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
    setQuizCompleted(false);
  };

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return "Excellent! You're a LimeOS expert!";
    if (percentage >= 60) return "Good job! You know quite a bit about LimeOS.";
    if (percentage >= 40) return "Not bad! Keep learning about LimeOS.";
    return "Keep studying! LimeOS has a lot to offer.";
  };

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-900 to-green-800 text-white p-8">
        <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-3xl font-bold mb-4">Quiz Complete!</h2>
        <div className="text-center mb-6">
          <p className="text-xl mb-2">Your Score: {score}/{questions.length}</p>
          <p className="text-lg text-green-200">{getScoreMessage()}</p>
        </div>
        <button
          onClick={resetQuiz}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Take Quiz Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-green-900 to-green-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-700">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-green-400" />
          <h1 className="text-xl font-bold">LimeOS Quiz</h1>
        </div>
        <div className="text-sm text-green-200">
          Question {currentQuestion + 1} of {questions.length}
        </div>
      </div>

      {/* Quiz Content */}
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              {questions[currentQuestion].question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-8">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === index
                    ? 'border-green-400 bg-green-700 bg-opacity-50'
                    : 'border-green-600 hover:border-green-500 hover:bg-green-800 hover:bg-opacity-30'
                }`}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                selectedAnswer !== null
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-t border-green-700">
        <div className="w-full bg-green-800 rounded-full h-2">
          <div
            className="bg-green-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <div className="text-center text-sm text-green-200 mt-2">
          Progress: {currentQuestion + 1} / {questions.length}
        </div>
      </div>
    </div>
  );
};

export default LimeQuizApp;