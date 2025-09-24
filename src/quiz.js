import supabase from './supabase.js';
import { beans } from './beans.js';

export function initTasteProfile() {
  // --- Quiz Data (5 questions) ---
  const quizData = [
    {
      question: "For me, the perfect coffee moment is…",
      type: "single",
      options: [
        { text: "Morning pick-me-up", scores: { intensity: 2 } },
        { text: "Afternoon treat", scores: { sweetness: 2 } },
        { text: "Slow weekend brew", scores: { body: 2 } }
      ]
    },
    {
      question: "I like my coffee to be…",
      type: "single",
      options: [
        { text: "Light & bright", scores: { acidity: 2 } },
        { text: "Medium & balanced", scores: { body: 1, sweetness: 1 } },
        { text: "Strong & bold", scores: { body: 2, intensity: 2 } }
      ]
    },
    {
      question: "It tastes even better with hints of… (select two)",
      type: "multi",
      maxChoices: 2,
      options: [
        { text: "Fruity / berry", scores: { fruity: 2 } },
        { text: "Floral / aromatic", scores: { floral: 2 } },
        { text: "Nutty / chocolatey", scores: { nutty: 2 } },
        { text: "Spicy / warming", scores: { spicy: 2 } },
        { text: "Caramel / sweet", scores: { sweet: 1 } }
      ]
    },
    {
      question: "When I make coffee myself, I usually use…",
      type: "single",
      options: [
        { text: "Espresso machine", scores: { intensity: 2 } },
        { text: "Pour-over / filter", scores: { acidity: 2, fruity: 1 } },
        { text: "French press", scores: { body: 2 } }
      ]
    },
    {
      question: "I almost always have my coffee…",
      type: "single",
      options: [
        { text: "Black", scores: { intensity: 2 } },
        { text: "With milk", scores: { sweetness: 1, body: 1 } },
        { text: "With sugar", scores: { sweetness: 2 } }
      ]
    }
  ];

  // --- Taste Profiles ---
  const tasteProfiles = [
    { slug: 'bright-fruity', name: "🍒Bright & Fruity Adventurer🍒", description: "Loves citrus and berry notes, lively and vibrant.", tags: ["fruity", "acidity"], beans: ["Ethiopian Yirgacheffe", "Kenya AA"] },
    { slug: 'sweet-smooth', name: "🍯Sweet & Smooth Lover🍯", description: "Enjoys caramel, honey, and gentle flavors.", tags: ["sweet", "body"], beans: ["Brazilian Santos", "Costa Rican Tarrazu"] },
    { slug: 'rich-nutty', name: "🍫Rich & Nutty Explorer🍫", description: "Prefers chocolatey, nutty, and full-bodied coffees.", tags: ["nutty", "body"], beans: ["Colombian Supremo", "Guatemalan Antigua"] },
    { slug: 'spicy-complex', name: "🌰Spicy & Complex Taster🌰", description: "Enjoys cinnamon, nutmeg, and warming spices.", tags: ["spicy", "intensity"], beans: ["Sumatran Mandheling", "Indian Monsooned Malabar"] },
    { slug: 'balanced-elegant', name: "⚖️Balanced & Elegant⚖️", description: "Seeks harmony across flavor, body, and acidity.", tags: ["balanced"], beans: ["Panama Geisha", "Honduras SHG"] }
  ];

  // --- DOM Elements ---
  const quizModal = document.getElementById('quiz-modal');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const progressBar = document.getElementById('quiz-progress');
  const quizLoading = document.getElementById('quiz-loading');
  const closeButton = document.getElementById('quiz-close-btn');
  const openButton = document.getElementById('quiz-button');

  // --- State ---
  let currentQuestionIndex = 0;
  let userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
  let lastProfile = null;

  // --- Reset Quiz ---
  function resetQuiz() {
    currentQuestionIndex = 0;
    userScores = { sweet: 0, acidity: 0, body: 0, nutty: 0, fruity: 0, floral: 0, spicy: 0, intensity: 0 };
  }

  // --- Show Question ---
  function showQuestion(index) {
    const q = quizData[index];
    quizOptions.innerHTML = '';
    quizQuestion.textContent = q.question;

    quizQuestion.classList.remove('enter');
    setTimeout(() => quizQuestion.classList.add('enter'), 50);

    if(progressBar) progressBar.textContent = `Question ${index + 1} of ${quizData.length}`;

    // --- Helper to go to next question ---
    function nextQuestion() {
      currentQuestionIndex++;
      if(currentQuestionIndex < quizData.length) {
        showQuestion(currentQuestionIndex);
      } else {
        showLoadingScreen();
      }
    }

    // --- Single-choice ---
    if(q.type === "single") {
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt.text;

        setTimeout(() => btn.classList.add('enter', `enter-${i+1}`), i * 100);

        btn.addEventListener('click', () => {
          for (const [key, val] of Object.entries(opt.scores)) {
            userScores[key] += val;
          }
          nextQuestion();
        });

        quizOptions.appendChild(btn);
      });

    // --- Multi-choice ---
    } else if(q.type === "multi") {
      let multiChoiceSelections = [];

      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt.text;

        setTimeout(() => btn.classList.add('enter', `enter-${i+1}`), i * 100);

        btn.addEventListener('click', () => {
          if(multiChoiceSelections.includes(opt)) {
            multiChoiceSelections = multiChoiceSelections.filter(o => o !== opt);
            btn.classList.remove('selected');
          } else if(multiChoiceSelections.length < q.maxChoices) {
            multiChoiceSelections.push(opt);
            btn.classList.add('selected');
          }

          // Proceed when max choices selected
          if(multiChoiceSelections.length === q.maxChoices) {
            multiChoiceSelections.forEach(selectedOpt => {
              for (const [key, val] of Object.entries(selectedOpt.scores)) {
                userScores[key] += val;
              }
            });
            setTimeout(() => nextQuestion(), 300);
          }
        });

        quizOptions.appendChild(btn);
      });
    }
  }

  // --- Loading Screen ---
  function showLoadingScreen() {
    quizOptions.innerHTML = '';
    quizQuestion.textContent = '';
    if(quizLoading) {
      quizLoading.classList.remove('hidden');
      quizLoading.textContent = "Grinding your perfect cup… ☕";
    }
    setTimeout(() => displayResults(), 1500);
  }

  // --- Display Results ---
// --- Display Results ---
function displayResults(profileSlug = null) {
  if(progressBar) progressBar.textContent = '';
  quizOptions.innerHTML = '';
  quizQuestion.textContent = '';

  let profile;

  if(profileSlug) {
    profile = tasteProfiles.find(p => p.slug === profileSlug);
  } else {
    // Weighted scoring
    let highestScore = -1;
    tasteProfiles.forEach(p => {
      const score = p.tags.reduce((sum, tag) => sum + (userScores[tag] || 0), 0);
      if(score > highestScore) {
        highestScore = score;
        profile = p;
      }
    });
  }

  lastProfile = profile;
  window.history.replaceState(null, '', `/coffee-profile?profile=${profile.slug}`);

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'results-container';
  quizOptions.appendChild(resultsContainer);

  const profileNameEl = document.createElement('h1');
  profileNameEl.className = 'profile-name';
  profileNameEl.textContent = profile.name;
  resultsContainer.appendChild(profileNameEl);

  const descriptionEl = document.createElement('p');
  descriptionEl.className = 'profile-description';
  descriptionEl.textContent = profile.description;
  resultsContainer.appendChild(descriptionEl);

  const beansHeading = document.createElement('h2');
  beansHeading.className = 'beans-heading';
  beansHeading.textContent = 'Recommended Beans';
  resultsContainer.appendChild(beansHeading);

  const beansList = document.createElement('ul');
  beansList.className = 'beans-list';

  profile.beans.forEach(beanName => {
    const bean = beans.find(b => b.region === beanName);
    const beanItem = document.createElement('li');
    beanItem.className = 'bean-card';

    if(bean) {
      const link = document.createElement('a');
      link.href = `/beans/${bean.slug}`;
      link.textContent = bean.region;
      link.addEventListener('click', e => {
        e.preventDefault();
        showBeanDetail(bean.slug); // <-- load roaster page
      });
      beanItem.appendChild(link);
    } else {
      beanItem.textContent = beanName;
    }

    beansList.appendChild(beanItem);
  });

  resultsContainer.appendChild(beansList);

  // --- Action Buttons ---
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'results-actions';

  const retakeBtn = document.createElement('button');
  retakeBtn.id = 'retake-quiz-btn';
  retakeBtn.textContent = 'Retake Quiz';
  retakeBtn.addEventListener('click', () => {
    resetQuiz();
    showQuestion(0);
  });
  actionsDiv.appendChild(retakeBtn);

  const shareBtn = document.createElement('button');
  shareBtn.id = 'share-quiz-btn';
  shareBtn.textContent = 'Share Profile';
  shareBtn.addEventListener('click', async () => {
    const shareText = `I got the "${profile.name}" coffee profile! Recommended beans: ${profile.beans.join(', ')}`;
    const shareData = { title: profile.name, text: shareText, url: window.location.href };
    try {
      if(navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch(err) {
      console.error('Share failed:', err);
      alert('Sharing failed.');
    }
  });
  actionsDiv.appendChild(shareBtn);

  resultsContainer.appendChild(actionsDiv);

  // --- Animate Results ---
  const fadeIn = (el, delay = 0) => {
    el.style.opacity = 0;
    el.style.transform = 'translateY(10px)';
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
  beansList.querySelectorAll('.bean-card').forEach((beanEl, i) => fadeIn(beanEl, 1200 + i * 150));
  fadeIn(actionsDiv, 1500 + profile.beans.length * 150);
}

// --- Show Bean Detail ---
function showBeanDetail(slug) {
  const bean = beans.find(b => b.slug === slug);
  if (!bean) return;

  quizOptions.innerHTML = '';
  quizQuestion.textContent = bean.region;
  quizQuestion.classList.add('eyebrow');

  const profileEl = document.createElement('p');
  profileEl.textContent = bean.profile;
  quizOptions.appendChild(profileEl);

  const roasterGrid = document.createElement('div');
  roasterGrid.className = 'roaster-grid';
  const userCountry = "South Africa";
  const filteredRoasters = bean.roasters.filter(r => r.country === userCountry).slice(0, 4);
  const placeholders = 4 - filteredRoasters.length;

  filteredRoasters.forEach(r => {
    const card = document.createElement('div');
    card.className = 'roaster-card';
    if (r.link) {
      const link = document.createElement('a');
      link.href = r.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const img = document.createElement('img');
      img.src = r.image;
      img.alt = r.name;
      link.appendChild(img);
      card.appendChild(link);
    } else {
      const img = document.createElement('img');
      img.src = r.image;
      img.alt = r.name;
      card.appendChild(img);
    }
    roasterGrid.appendChild(card);
  });

  for (let i = 0; i < placeholders; i++) {
    const card = document.createElement('div');
    card.className = 'roaster-card placeholder';
    const img = document.createElement('img');
    img.src = '/roasters/placeholder-roaster.png';
    img.alt = 'Placeholder roaster';
    card.appendChild(img);
    roasterGrid.appendChild(card);
  }

  quizOptions.appendChild(roasterGrid);

  const backBtn = document.createElement('button');
  backBtn.textContent = '⬅ Back to Results';
  backBtn.className = 'action-btn';
  backBtn.addEventListener('click', () => displayResults(lastProfile.slug));
  quizOptions.appendChild(backBtn);
}


  // --- Modal Controls ---
  function openQuiz() {
    resetQuiz();
    quizModal.classList.remove('hidden');
    setTimeout(() => quizModal.classList.add('visible'), 10);
    showQuestion(0);
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
