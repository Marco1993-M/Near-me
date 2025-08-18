import supabase from './supabase.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

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
        { text: "With milk", scores: { sweet: 1 } },
        { text: "With sugar", scores: { sweet: 2 } }
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
    { name: "Bright & Fruity Adventurer", description: "Loves citrus and berry notes, lively and vibrant.", beans: ["Ethiopian Yirgacheffe", "Kenya AA"] },
    { name: "Sweet & Smooth Lover", description: "Enjoys caramel, honey, and gentle flavors.", beans: ["Brazilian Santos", "Costa Rican Tarrazu"] },
    { name: "Rich & Nutty Explorer", description: "Prefers chocolatey, nutty, and full-bodied coffees.", beans: ["Colombian Supremo", "Guatemalan Antigua"] },
    { name: "Spicy & Complex Taster", description: "Enjoys cinnamon, nutmeg, and warming spices.", beans: ["Sumatran Mandheling", "Indian Monsooned Malabar"] },
    { name: "Balanced & Elegant", description: "Seeks harmony across flavor, body, and acidity.", beans: ["Panama Geisha", "Honduras SHG"] }
  ];

  const quizModal = document.getElementById('quiz-modal');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const progressBar = document.getElementById('quiz-progress');
  const closeButton = document.getElementById('quiz-close-btn');
  const openButton = document.getElementById('taste-profile-btn');
  const flavorWheelCanvas = document.getElementById('flavor-wheel');

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
    let profile;
    if(userScores.fruity + userScores.floral > userScores.nutty + userScores.spicy){
      profile = tasteProfiles[0];
    } else if(userScores.sweet > userScores.nutty){
      profile = tasteProfiles[1];
    } else if(userScores.nutty > 0){
      profile = tasteProfiles[2];
    } else if(userScores.spicy > 0){
      profile = tasteProfiles[3];
    } else {
      profile = tasteProfiles[4];
    }

    quizQuestion.textContent = `Your Coffee Profile: ${profile.name}`;
    quizOptions.innerHTML = `
      <p>${profile.description}</p>
      <p>Recommended Beans:</p>
      <ul>${profile.beans.map(bean => `<li>${bean}</li>`).join('')}</ul>
      <button id="retake-quiz-btn" class="quiz-option">Retake Quiz</button>
    `;

    document.getElementById('retake-quiz-btn').addEventListener('click', () => {
      currentQuestionIndex = 0;
      userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
      flavorWheelCanvas.style.display = 'none';
      showQuestion(currentQuestionIndex);
    });

    // Show flavor wheel
    flavorWheelCanvas.style.display = 'block';
    new Chart(flavorWheelCanvas, {
      type: 'radar',
      data: {
        labels: ['Sweet', 'Acidity', 'Body', 'Nutty', 'Fruity', 'Floral', 'Spicy', 'Intensity'],
        datasets: [{
          label: 'Your Flavor Profile',
          data: [
            userScores.sweet, userScores.acidity, userScores.body,
            userScores.nutty, userScores.fruity, userScores.floral,
            userScores.spicy, userScores.intensity
          ],
          backgroundColor: 'rgba(199, 244, 211, 0.3)',
          borderColor: '#c7f4d3',
          borderWidth: 2
        }]
      },
      options: {
        scales: { r: { beginAtZero: true, max: 4 } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function openQuiz() {
    currentQuestionIndex = 0;
    userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
    quizModal.classList.remove('hidden');
    flavorWheelCanvas.style.display = 'none';
    showQuestion(currentQuestionIndex);
  }

  function closeQuiz() {
    quizModal.classList.add('hidden');
  }

  // ✅ Attach event listeners AFTER DOM exists
  document.addEventListener('DOMContentLoaded', () => {
    openButton.addEventListener('click', openQuiz);
    closeButton.addEventListener('click', closeQuiz);
  });
}
