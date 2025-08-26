import supabase from './supabase.js';
import { beans } from './beans.js';

export function initTasteProfile() {
  // --- Quiz Data ---
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

  // --- Taste Profiles with slugs ---
  const tasteProfiles = [
    { slug: 'bright-fruity', name: "🍒Bright & Fruity Adventurer🍒", description: "Loves citrus and berry notes, lively and vibrant.", beans: ["Ethiopian Yirgacheffe", "Kenya AA"] },
    { slug: 'sweet-smooth', name: "🍯Sweet & Smooth Lover🍯", description: "Enjoys caramel, honey, and gentle flavors.", beans: ["Brazilian Santos", "Costa Rican Tarrazu"] },
    { slug: 'rich-nutty', name: "🍫Rich & Nutty Explorer🍫", description: "Prefers chocolatey, nutty, and full-bodied coffees.", beans: ["Colombian Supremo", "Guatemalan Antigua"] },
    { slug: 'spicy-complex', name: "🌰Spicy & Complex Taster🌰", description: "Enjoys cinnamon, nutmeg, and warming spices.", beans: ["Sumatran Mandheling", "Indian Monsooned Malabar"] },
    { slug: 'balanced-elegant', name: "⚖️Balanced & Elegant⚖️", description: "Seeks harmony across flavor, body, and acidity.", beans: ["Panama Geisha", "Honduras SHG"] }
  ];

  // --- DOM Elements ---
  const quizModal = document.getElementById('quiz-modal');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const progressBar = document.getElementById('quiz-progress');
  const closeButton = document.getElementById('quiz-close-btn');
  const openButton = document.getElementById('taste-profile-btn');

  // --- State ---
  let currentQuestionIndex = 0;
  let userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
  let lastProfile = null;

  // --- Show Question ---
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

  // --- Display Results ---
  function displayResults(profileSlug = null) {
    let profile;

    if(profileSlug) {
      profile = tasteProfiles.find(p => p.slug === profileSlug);
    } else {
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
    }

    lastProfile = profile;

    // Update URL for sharing
    window.history.replaceState(null, '', `/coffee-profile?profile=${profile.slug}`);

    quizQuestion.textContent = profile.name;
    quizOptions.innerHTML = `
      <p>${profile.description}</p>
      <p>We can recommend these beans</p>
      <ul>
        ${profile.beans.map(beanName => {
          const bean = beans.find(b => b.region === beanName);
          return bean
            ? `<li><a href="#" class="quiz-bean-link" data-slug="${bean.slug}">${bean.region}</a></li>`
            : `<li>${beanName}</li>`;
        }).join('')}
      </ul>
      <button id="retake-quiz-btn" class="quiz-option">Retake Quiz</button>
      <button id="share-quiz-btn" class="quiz-option">Share this result</button>
    `;

    document.getElementById('retake-quiz-btn').addEventListener('click', () => {
      currentQuestionIndex = 0;
      userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
      showQuestion(currentQuestionIndex);
    });

    document.getElementById('share-quiz-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert("Link copied to clipboard!"))
        .catch(() => alert("Failed to copy link."));
    });

    document.querySelectorAll('.quiz-bean-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const slug = e.target.dataset.slug;
        showBeanDetail(slug);
      });
    });
  }

  // --- Show Bean Detail ---
function showBeanDetail(slug) {
  const bean = beans.find(b => b.slug === slug);
  if (!bean) return;

  const userCountry = "South Africa";
  const filteredRoasters = bean.roasters.filter(r => r.country === userCountry);

  // Take up to 4 real roasters
  const limitedRoasters = filteredRoasters.slice(0, 4);

  // Fill placeholders if less than 4
  const roastersWithPlaceholders = [
    ...limitedRoasters,
    ...Array(Math.max(0, 4 - limitedRoasters.length)).fill({ placeholder: true })
  ];

  quizQuestion.textContent = '';
  quizOptions.innerHTML = `
    <p class="eyebrow">Find your local stockist</p>
    <h2 class="bean-name">${bean.region}</h2>
    <p class="bean-profile">${bean.profile}</p>
    <div class="roaster-grid">
      ${roastersWithPlaceholders.map(r => `
        <div class="roaster-card ${r.placeholder ? 'roaster-placeholder' : ''}">
${r.placeholder
  ? `<img src="/roasters/placeholder-roaster.png" alt="Placeholder roaster" class="placeholder-img" />`
  : (r.link 
      ? `<a href="${r.link}" target="_blank" rel="noopener noreferrer">
           <img src="${r.image}" alt="${r.name}" />
         </a>`
      : `<img src="${r.image}" alt="${r.name}" />`
    )
}

        </div>
      `).join('')}
    </div>
    <p class="roaster-footer-text">Don’t see your roaster?</p>
    <button id="back-to-results">⬅ Back to Results</button>
  `;

  document.getElementById('back-to-results').addEventListener('click', () => {
    quizOptions.innerHTML = '';
    displayResults(lastProfile.slug);
  });
}


  // --- Modal Controls ---
  function openQuiz() {
    currentQuestionIndex = 0;
    userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
    quizModal.classList.remove('hidden');
    showQuestion(currentQuestionIndex);

    // Update URL
    window.history.pushState(null, '', '/coffee-profile');
  }

  function closeQuiz() {
    quizModal.classList.add('hidden');
    // Optional: revert URL
    window.history.pushState(null, '', '/');
  }

  openButton?.addEventListener('click', openQuiz);
  closeButton?.addEventListener('click', closeQuiz);

  // --- Auto-open modal if URL matches ---
  const urlParams = new URLSearchParams(window.location.search);
  const profileSlug = urlParams.get('profile');

  if(window.location.pathname === '/coffee-profile' && quizModal) {
    quizModal.classList.remove('hidden');
    if(profileSlug) {
      displayResults(profileSlug);
    } else {
      showQuestion(0);
    }
  }
}
