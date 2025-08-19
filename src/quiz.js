import supabase from './supabase.js';

export function initTasteProfile() {
  const quizData = [
    { question: "Do you prefer coffee sweet, sour, or bitter?", options: [
        { text: "Sweet", scores: { sweet: 2 } },
        { text: "Sour / bright", scores: { acidity: 2 } },
        { text: "Bitter / strong", scores: { body: 2 } }
      ]
    },
    { question: "Do you enjoy fruity, floral, nutty, or chocolate notes?", options: [
        { text: "Fruity", scores: { fruity: 2 } },
        { text: "Floral", scores: { floral: 2 } },
        { text: "Nutty / chocolate", scores: { nutty: 2 } }
      ]
    },
    { question: "Do you like spicy or caramel notes?", options: [
        { text: "Spicy", scores: { spicy: 2 } },
        { text: "Caramel / sweet", scores: { sweet: 1 } },
        { text: "No preference", scores: {} }
      ]
    },
    { question: "Do you prefer coffee light-bodied or full-bodied?", options: [
        { text: "Light", scores: { body: 1 } },
        { text: "Full", scores: { body: 2 } }
      ]
    },
    { question: "How do you usually drink coffee?", options: [
        { text: "Black", scores: { intensity: 2 } },
        { text: "With milk", scores: { sweetness: 1 } },
        { text: "With sugar", scores: { sweetness: 2 } }
      ]
    },
    { question: "Do you like coffee acidic or mellow?", options: [
        { text: "Acidic / bright", scores: { acidity: 2 } },
        { text: "Mellow / smooth", scores: { body: 2 } }
      ]
    },
    { question: "Which finish do you prefer?", options: [
        { text: "Clean & crisp", scores: { acidity: 1 } },
        { text: "Long & chocolatey", scores: { nutty: 1 } }
      ]
    },
    { question: "Choose a preferred aroma", options: [
        { text: "Fruity", scores: { fruity: 1 } },
        { text: "Floral", scores: { floral: 1 } },
        { text: "Nutty / Cocoa", scores: { nutty: 1 } }
      ]
    }
  ];

  const tasteProfiles = [
    { name: "🍒Bright & Fruity Adventurer🍒", description: "Loves citrus and berry notes, lively and vibrant.", beans: ["Ethiopian Yirgacheffe", "Kenya AA"] },
    { name: "🍯Sweet & Smooth Lover🍯", description: "Enjoys caramel, honey, and gentle flavors.", beans: ["Brazilian Santos", "Costa Rican Tarrazu"] },
    { name: "🍫Rich & Nutty Explorer🍫", description: "Prefers chocolatey, nutty, and full-bodied coffees.", beans: ["Colombian Supremo", "Guatemalan Antigua"] },
    { name: "🌰Spicy & Complex Taster🌰", description: "Enjoys cinnamon, nutmeg, and warming spices.", beans: ["Sumatran Mandheling", "Indian Monsooned Malabar"] },
    { name: "⚖️Balanced & Elegant⚖️", description: "Seeks harmony across flavor, body, and acidity.", beans: ["Panama Geisha", "Honduras SHG"] }
  ];

  const quizModal = document.getElementById('quiz-modal');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const progressBar = document.getElementById('quiz-progress');
  const closeButton = document.getElementById('quiz-close-btn');
  const openButton = document.getElementById('taste-profile-btn');

  let currentQuestionIndex = 0;
  let userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };

  function showQuestion(index) {
    const q = quizData[index];
    quizQuestion.textContent = q.question;
    quizOptions.innerHTML = '';

    if(progressBar) progressBar.textContent = `Question ${index + 1} of ${quizData.length}`;

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        for (const [key, val] of Object.entries(opt.scores)) {
          userScores[key] += val;
        }
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
    // determine top matching profile by comparing dominant scores
    let profile;
    if(userScores.fruity + userScores.floral > userScores.nutty + userScores.spicy){
      profile = tasteProfiles[0]; // Bright & Fruity Adventurer
    } else if(userScores.sweet > userScores.nutty){
      profile = tasteProfiles[1]; // Sweet & Smooth Lover
    } else if(userScores.nutty > 0){
      profile = tasteProfiles[2]; // Rich & Nutty Explorer
    } else if(userScores.spicy > 0){
      profile = tasteProfiles[3]; // Spicy & Complex
    } else {
      profile = tasteProfiles[4]; // Balanced & Elegant
    }

    quizQuestion.textContent = `${profile.name}`;
    quizOptions.innerHTML = `
      <p>${profile.description}</p>
      <p>We can recommend these beans</p>
      <ul>${profile.beans.map(bean => `<li>${bean}</li>`).join('')}</ul>
      <button id="retake-quiz-btn" class="quiz-option">Retake Quiz</button>
    `;

    document.getElementById('retake-quiz-btn').addEventListener('click', () => {
      currentQuestionIndex = 0;
      userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
      showQuestion(currentQuestionIndex);
    });
  }

  function openQuiz() {
    currentQuestionIndex = 0;
    userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
    quizModal.classList.remove('hidden');
    showQuestion(currentQuestionIndex);
  }

  function closeQuiz() {
    quizModal.classList.add('hidden');
  }

  openButton.addEventListener('click', openQuiz);
  closeButton.addEventListener('click', closeQuiz);
}
