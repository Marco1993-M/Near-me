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

  // --- Taste Profiles ---
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
    quizOptions.innerHTML = '';
    quizQuestion.textContent = q.question;

    // Animate question
    quizQuestion.classList.remove('enter');
    setTimeout(() => quizQuestion.classList.add('enter'), 50);

    // Update progress
    if(progressBar) progressBar.textContent = `Question ${index + 1} of ${quizData.length}`;

    // Render options with fade-in
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt.text;
      quizOptions.appendChild(btn);

      // Animate option with stagger
      setTimeout(() => btn.classList.add('enter'), i * 100);

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
    });
  }

 function displayResults(profileSlug = null) {
  if (progressBar) progressBar.textContent = '';
  let profile;

  if (profileSlug) {
    profile = tasteProfiles.find(p => p.slug === profileSlug);
  } else {
    if (userScores.fruity + userScores.floral > userScores.nutty + userScores.spicy) {
      profile = tasteProfiles[0];
    } else if (userScores.sweet > userScores.nutty) {
      profile = tasteProfiles[1];
    } else if (userScores.nutty > 0) {
      profile = tasteProfiles[2];
    } else if (userScores.spicy > 0) {
      profile = tasteProfiles[3];
    } else {
      profile = tasteProfiles[4];
    }
  }

  lastProfile = profile;

  // Update URL
  window.history.replaceState(null, '', `/coffee-profile?profile=${profile.slug}`);

  // Clear quiz options
  quizOptions.innerHTML = '';
  quizQuestion.textContent = '';
  quizQuestion.classList.remove('eyebrow');

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'results-container';
  quizOptions.appendChild(resultsContainer);

  // Profile Name
  const profileNameEl = document.createElement('h1');
  profileNameEl.className = 'profile-name';
  profileNameEl.textContent = profile.name;
  profileNameEl.style.opacity = 0;
  profileNameEl.style.transform = 'translateY(10px)';
  resultsContainer.appendChild(profileNameEl);

  // Description
  const descriptionEl = document.createElement('p');
  descriptionEl.className = 'profile-description';
  descriptionEl.textContent = profile.description;
  descriptionEl.style.opacity = 0;
  descriptionEl.style.transform = 'translateY(10px)';
  resultsContainer.appendChild(descriptionEl);

  // Beans Heading
  const beansHeading = document.createElement('h2');
  beansHeading.className = 'beans-heading';
  beansHeading.textContent = 'Recommended Beans';
  beansHeading.style.opacity = 0;
  beansHeading.style.transform = 'translateY(10px)';
  resultsContainer.appendChild(beansHeading);

  // Beans List
  const beansList = document.createElement('ul');
  beansList.className = 'beans-list';
  beansList.style.opacity = 0;
  beansList.style.transform = 'translateY(10px)';

  profile.beans.forEach((beanName, i) => {
    const bean = beans.find(b => b.region === beanName);
    const beanItem = document.createElement('li');
    beanItem.className = 'bean-card';
    beanItem.style.opacity = 0;
    beanItem.style.transform = 'translateY(10px)';

    if (bean) {
      const link = document.createElement('a');
      link.href = `/beans/${bean.slug}`; // Link to bean/roaster page
      link.textContent = bean.region;
      link.className = 'quiz-bean-link';
      link.addEventListener('click', e => {
        e.preventDefault();
        showBeanDetail(bean.slug);
      });
      beanItem.appendChild(link);
    } else {
      beanItem.textContent = beanName;
    }

    beansList.appendChild(beanItem);
  });

  resultsContainer.appendChild(beansList);

  // Action Buttons
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'results-actions';
  actionsDiv.style.opacity = 0;
  actionsDiv.style.transform = 'translateY(10px)';

  const retakeBtn = document.createElement('button');
  retakeBtn.id = 'retake-quiz-btn';
  retakeBtn.className = 'action-btn';
  retakeBtn.textContent = 'Retake Quiz';
  actionsDiv.appendChild(retakeBtn);

  const shareBtn = document.createElement('button');
  shareBtn.id = 'share-quiz-btn';
  shareBtn.className = 'action-btn';
  shareBtn.textContent = 'Share Profile';
  actionsDiv.appendChild(shareBtn);

  resultsContainer.appendChild(actionsDiv);

  // --- Animate sections sequentially ---
  const fadeIn = (el, delay = 0) => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      el.style.opacity = 1;
      el.style.transform = 'translateY(0)';
    }, delay);
  };

  fadeIn(profileNameEl, 100);
  fadeIn(descriptionEl, 400);
  fadeIn(beansHeading, 700);
  fadeIn(beansList, 1000);

  // Stagger individual beans
  beansList.querySelectorAll('.bean-card').forEach((beanEl, i) => {
    fadeIn(beanEl, 1200 + i * 150);
  });

  fadeIn(actionsDiv, 1500 + profile.beans.length * 150);

  // --- Button functionality ---
  retakeBtn.addEventListener('click', () => {
    currentQuestionIndex = 0;
    userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
    showQuestion(currentQuestionIndex);
  });

  shareBtn.addEventListener('click', async () => {
    const shareText = `I got the "${profile.name}" coffee profile! Recommended beans: ${profile.beans.join(', ')}`;
    const shareData = { title: profile.name, text: shareText, url: window.location.href };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
      alert('Sharing failed.');
    }
  });
}


  // --- Show Bean Detail ---
  function showBeanDetail(slug) {
    if(progressBar) progressBar.textContent = '';
    const bean = beans.find(b => b.slug === slug);
    if(!bean) return;

    const userCountry = "South Africa";
    const filteredRoasters = bean.roasters.filter(r => r.country === userCountry);
    const limitedRoasters = filteredRoasters.slice(0, 4);
    const roastersWithPlaceholders = [
      ...limitedRoasters,
      ...Array(Math.max(0, 4 - limitedRoasters.length)).fill({ placeholder: true })
    ];

    quizOptions.innerHTML = '';
    quizQuestion.textContent = '';
    quizQuestion.classList.add('eyebrow');

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

    // Animate cards
    const cards = quizOptions.querySelectorAll('.roaster-card');
    cards.forEach((card, i) => setTimeout(() => card.classList.add('visible'), i * 100));

    document.getElementById('back-to-results').addEventListener('click', () => {
      quizOptions.innerHTML = '';
      quizQuestion.classList.remove('eyebrow');
      displayResults(lastProfile.slug);
    });
  }

  // --- Modal Controls ---
  function openQuiz() {
    currentQuestionIndex = 0;
    userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
    quizModal.classList.remove('hidden');
    setTimeout(() => quizModal.classList.add('visible'), 10);
    showQuestion(currentQuestionIndex);
    window.history.pushState(null, '', '/coffee-profile');
  }

  function closeQuiz() {
    quizModal.classList.remove('visible');
    setTimeout(() => quizModal.classList.add('hidden'), 250);
    window.history.pushState(null, '', '/');
  }

  openButton?.addEventListener('click', openQuiz);
  closeButton?.addEventListener('click', closeQuiz);

  // --- Auto-open modal if URL matches ---
  const urlParams = new URLSearchParams(window.location.search);
  const profileSlug = urlParams.get('profile');

  if(window.location.pathname === '/coffee-profile' && quizModal) {
    quizModal.classList.remove('hidden');
    setTimeout(() => quizModal.classList.add('visible'), 10);
    if(profileSlug) displayResults(profileSlug);
    else showQuestion(0);
  }
}
