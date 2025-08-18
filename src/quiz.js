export function initTasteProfile() {
  const quizData = [
    {
      question: "What's your preferred coffee strength?",
      options: [
        { text: "Mild", scores: { intensity: 1 } },
        { text: "Medium", scores: { intensity: 2 } },
        { text: "Strong", scores: { intensity: 3 } },
      ],
    },
    {
      question: "Which flavor do you enjoy most?",
      options: [
        { text: "Sweet", scores: { sweet: 2 } },
        { text: "Acidic/Fruity", scores: { acidity: 2, fruity: 2 } },
        { text: "Nutty/Spicy", scores: { nutty: 2, spicy: 2 } },
      ],
    },
    {
      question: "Preferred roast level?",
      options: [
        { text: "Light Roast", scores: { acidity: 2, fruity: 2 } },
        { text: "Medium Roast", scores: { body: 2, sweet: 1 } },
        { text: "Dark Roast", scores: { intensity: 3, bitter: 2 } },
      ],
    },
    {
      question: "Do you like milk in your coffee?",
      options: [
        { text: "Black only", scores: { intensity: 2 } },
        { text: "Some milk", scores: { body: 2, sweet: 1 } },
        { text: "Lots of milk", scores: { creamy: 3, sweet: 2 } },
      ],
    },
    {
      question: "Acidity preference?",
      options: [
        { text: "Low", scores: { acidity: 1 } },
        { text: "Medium", scores: { acidity: 2 } },
        { text: "High", scores: { acidity: 3 } },
      ],
    },
    {
      question: "Do you prefer sweet notes?",
      options: [
        { text: "Not at all", scores: { sweet: 1 } },
        { text: "Moderate", scores: { sweet: 2 } },
        { text: "Very sweet", scores: { sweet: 3 } },
      ],
    },
    {
      question: "Preferred body/mouthfeel?",
      options: [
        { text: "Light", scores: { body: 1 } },
        { text: "Medium", scores: { body: 2 } },
        { text: "Full", scores: { body: 3 } },
      ],
    },
    {
      question: "Do you enjoy floral or aromatic notes?",
      options: [
        { text: "Yes, floral", scores: { floral: 3 } },
        { text: "Somewhat", scores: { floral: 2 } },
        { text: "No", scores: { floral: 1 } },
      ],
    },
    {
      question: "Do you like spicy/nutty flavors?",
      options: [
        { text: "Yes", scores: { spicy: 3, nutty: 3 } },
        { text: "Sometimes", scores: { spicy: 2, nutty: 2 } },
        { text: "No", scores: { spicy: 1, nutty: 1 } },
      ],
    },
    {
      question: "How adventurous are you with coffee?",
      options: [
        { text: "Try new things", scores: { fruity: 2, floral: 2, spicy: 2 } },
        { text: "Moderate", scores: { intensity: 2, body: 2 } },
        { text: "Stick to what I know", scores: { sweet: 2, creamy: 2 } },
      ],
    },
  ];

  const tasteProfiles = [
    { name: "Sweet Tooth", criteria: { sweet: 6 } },
    { name: "Fruity Lover", criteria: { fruity: 4, acidity: 4 } },
    { name: "Bold & Strong", criteria: { intensity: 7 } },
    { name: "Nutty Spice Fan", criteria: { nutty: 5, spicy: 4 } },
    { name: "Floral Explorer", criteria: { floral: 5 } },
    { name: "Balanced Coffee Drinker", criteria: {} }, // fallback
  ];

  const quizModal = document.getElementById('quiz-modal');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const progressBar = document.getElementById('quiz-progress');
  const closeButton = document.getElementById('quiz-close-btn');
  const openButton = document.getElementById('taste-profile-btn');

  let currentQuestionIndex = 0;
  let userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0, bitter: 0, creamy: 0 };

  function showQuestion(index) {
    const question = quizData[index];
    quizQuestion.textContent = question.question;
    quizOptions.innerHTML = '';
    question.options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.className = 'quiz-option-button';
      button.addEventListener('click', () => {
        for (const key in option.scores) {
          if (userScores[key] !== undefined) userScores[key] += option.scores[key];
        }
        currentQuestionIndex++;
        if (currentQuestionIndex < quizData.length) {
          showQuestion(currentQuestionIndex);
        } else {
          displayResults();
        }
      });
      quizOptions.appendChild(button);
    });

    const progressPercent = ((index) / quizData.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
  }

  function displayResults() {
    quizQuestion.textContent = 'Your Coffee Taste Profile';
    quizOptions.innerHTML = '';
    const matchedProfile = tasteProfiles.find(profile => {
      return Object.keys(profile.criteria).every(key => userScores[key] >= profile.criteria[key]);
    }) || { name: 'Balanced Coffee Drinker' };
    const resultDiv = document.createElement('div');
    resultDiv.textContent = matchedProfile.name;
    resultDiv.className = 'quiz-result';
    quizOptions.appendChild(resultDiv);
  }

  function openQuiz() {
    if (quizModal) {
      quizModal.classList.remove('hidden');
      quizModal.classList.add('active');
      currentQuestionIndex = 0;
      userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0, bitter: 0, creamy: 0 };
      showQuestion(currentQuestionIndex);
    }
  }

  function closeQuiz() {
    if (quizModal) {
      quizModal.classList.remove('active');
      quizModal.classList.add('hidden');
    }
  }

  if (openButton) openButton.addEventListener('click', openQuiz);
  if (closeButton) closeButton.addEventListener('click', closeQuiz);
}
