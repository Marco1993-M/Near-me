import supabase from './supabase.js';

export function initTasteProfile() {
  const quizData = [
    {
      question: "Which flavor notes do you usually enjoy in coffee?",
      options: [
        { text: "Sweet (honey, caramel)", scores: { sweet: 2 } },
        { text: "Fruity (berries, citrus)", scores: { fruity: 2 } },
        { text: "Nutty/Cocoa (chocolate, almond)", scores: { nutty: 2 } }
      ],
    },
    {
      question: "Do you like floral notes?",
      options: [
        { text: "Yes, I love floral notes", scores: { floral: 2 } },
        { text: "No, I prefer other notes", scores: {} }
      ],
    },
    {
      question: "How sweet do you like your coffee?",
      options: [
        { text: "Very sweet", scores: { sweet: 2 } },
        { text: "Somewhat sweet", scores: { sweet: 1 } },
        { text: "Not very sweet", scores: {} }
      ],
    },
    {
      question: "Do you enjoy spicy notes?",
      options: [
        { text: "Yes, I like spices", scores: { spicy: 2 } },
        { text: "No", scores: {} }
      ],
    },
    {
      question: "Which nutty/cocoa flavor do you prefer?",
      options: [
        { text: "Chocolate", scores: { nutty: 1 } },
        { text: "Almond", scores: { nutty: 1 } },
        { text: "Hazelnut", scores: { nutty: 1 } }
      ],
    },
  ];

  const flavorProfiles = [
    {
      name: "The Sweet Tooth",
      description: "Indulgent, caramel & honey notes.",
      bean: "Brazilian Santos"
    },
    {
      name: "The Floral Fan",
      description: "Delicate, jasmine & rose notes.",
      bean: "Kenyan AA"
    },
    {
      name: "The Fruity Lover",
      description: "Bright, citrusy and berry notes.",
      bean: "Ethiopian Yirgacheffe"
    },
    {
      name: "The Nutty Delight",
      description: "Rich, chocolatey and almond flavors.",
      bean: "Colombian Supremo"
    },
    {
      name: "The Spice Route",
      description: "Warm, cinnamon & nutmeg notes.",
      bean: "Sumatran Mandheling"
    },
  ];

  const quizModal = document.getElementById('quiz-modal');
  const quizContainer = document.querySelector('.quiz-container');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const progressBar = document.getElementById('quiz-progress');
  const closeButton = document.getElementById('quiz-close-btn');
  const openButton = document.getElementById('taste-profile-btn');

  let currentQuestionIndex = 0;
  let userScores = { sweet: 0, fruity: 0, nutty: 0, floral: 0, spicy: 0 };

  function showQuestion(index) {
    const q = quizData[index];
    quizQuestion.textContent = q.question;
    quizOptions.innerHTML = '';

    // update progress
    if(progressBar) progressBar.textContent = `Question ${index + 1} of ${quizData.length}`;

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        // add scores
        for (const [key, val] of Object.entries(opt.scores)) {
          userScores[key] += val;
        }

        // next question or show results
        if (currentQuestionIndex < quizData.length - 1) {
          currentQuestionIndex++;
          showQuestion(currentQuestionIndex);
        } else {
          displayResults();
        }
      });
      quizOptions.appendChild(btn);
    });
  }

  function displayResults() {
    // determine top flavor
    const topFlavor = Object.keys(userScores).reduce((a, b) => userScores[a] > userScores[b] ? a : b);
    let profile;
    switch(topFlavor) {
      case 'sweet': profile = flavorProfiles[0]; break;
      case 'floral': profile = flavorProfiles[1]; break;
      case 'fruity': profile = flavorProfiles[2]; break;
      case 'nutty': profile = flavorProfiles[3]; break;
      case 'spicy': profile = flavorProfiles[4]; break;
      default: profile = flavorProfiles[2];
    }

    quizQuestion.textContent = `Your Taste Profile: ${profile.name}`;
    quizOptions.innerHTML = `
      <p>${profile.description}</p>
      <p>Recommended Coffee Bean: <strong>${profile.bean}</strong></p>
      <button id="retake-quiz-btn" class="quiz-option">Retake Quiz</button>
    `;

    document.getElementById('retake-quiz-btn').addEventListener('click', () => {
      currentQuestionIndex = 0;
      userScores = { sweet: 0, fruity: 0, nutty: 0, floral: 0, spicy: 0 };
      showQuestion(currentQuestionIndex);
    });
  }

  function openQuiz() {
    currentQuestionIndex = 0;
    userScores = { sweet: 0, fruity: 0, nutty: 0, floral: 0, spicy: 0 };
    quizModal.classList.add('active');
    quizModal.classList.remove('hidden');
    showQuestion(currentQuestionIndex);
  }

  function closeQuiz() {
    quizModal.classList.remove('active');
    quizModal.classList.add('hidden');
  }

  openButton.addEventListener('click', openQuiz);
  closeButton.addEventListener('click', closeQuiz);
}
