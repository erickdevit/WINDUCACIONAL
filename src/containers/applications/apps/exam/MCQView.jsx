import React, { useState } from "react";
import { ExamTimer } from "./components/ExamTimer";

export const MCQView = ({ questions, onFinish }) => {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const mcqQuestions = questions.filter(q => q.type === 'mcq');

  const handleSelect = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleNext = (nextAnswers = answers) => {
    if (currentIndex < mcqQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish(nextAnswers);
    }
  };

  const handleQuestionTimeUp = () => {
    handleNext(answers);
  };

  const q = mcqQuestions[currentIndex];

  if (!q) return <div>Nenhuma questão teórica encontrada.</div>;

  return (
    <div className="mcq-view win11Scroll">
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-sm font-medium text-blue-600 uppercase tracking-wider">Questão {currentIndex + 1} de {mcqQuestions.length}</span>
            <span className="block text-xs text-gray-400">{Math.round(((currentIndex + 1) / mcqQuestions.length) * 100)}% concluído</span>
          </div>
          {q.timeLimit > 0 && (
            <ExamTimer
              key={q.id}
              minutes={q.timeLimit}
              onTimeUp={handleQuestionTimeUp}
            />
          )}
        </div>
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / mcqQuestions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-8">
        <h3 className="text-xl font-semibold mb-8 text-gray-800 leading-relaxed">
          {q.text}
        </h3>

        <div className="space-y-4">
          {q.options.map((opt, i) => {
            const label = String.fromCharCode(97 + i); // a, b, c, d
            const isSelected = answers[q.id] === label;
            
            return (
              <label 
                key={i}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="radio" 
                  name={`q-${q.id}`} 
                  className="hidden" 
                  checked={isSelected}
                  onChange={() => handleSelect(q.id, label)}
                />
                <span className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-4 ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </span>
                <span className="text-gray-700 font-medium mr-2">{label})</span>
                <span className="text-gray-700">{opt}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-10 flex justify-end">
          <button 
            disabled={!answers[q.id]}
            onClick={() => handleNext()}
            className={`px-8 py-3 rounded-lg font-bold text-white transition-all ${
              answers[q.id] 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-md transform hover:-translate-y-0.5' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {currentIndex < mcqQuestions.length - 1 ? 'Próxima Questão' : 'Finalizar Teoria'}
          </button>
        </div>
      </div>
    </div>
  );
};
