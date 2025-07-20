import supabase from './supabase.js';

export function initTasteProfile() {
 const quizData = [
  {
    question: "Which of the following flavor notes do you prefer in your coffee?",
    options: ["Sweet (e.g. honey, caramelized)", "Fruity (e.g. berries, citrus)", "Nutty/Cocoa (e.g. chocolate, almond)"],
  },
  {
    question: "Do you like floral notes in your coffee?",
    options: ["Yes, I love floral notes (e.g. chamomile, jasmine)", "No, I prefer other flavor notes"],
  },
  {
    question: "How sweet do you like your coffee?",
    options: ["Very sweet (e.g. caramelized, maple syrup)", "Somewhat sweet (e.g. honey)", "Not very sweet"],
  },
  {
    question: "Do you like spices in your coffee?",
    options: ["Yes, I like spices (e.g. cinnamon, nutmeg)", "No, I prefer other flavor notes"],
  },
  {
    question: "Which of the following nutty/cocoa flavors do you prefer in your coffee?",
    options: ["Chocolate", "Almond", "Hazelnut"],
  },
];

const tasteProfiles = [
  {
    name: "The Sweet Tooth",
    description: "A sweet and indulgent coffee with notes of honey and caramelized sugar.",
    matches: (answers) => answers[0] === 0 && answers[2] === 0,
    recommendedBean: "Brazilian Santos",
  },
  {
    name: "The Floral Fan",
    description: "A delicate and floral coffee with notes of jasmine and rose.",
    matches: (answers) => answers[1] === 0,
    recommendedBean: "Kenyan AA",
  },
  {
    name: "The Fruity Lover",
    description: "A bright and fruity coffee with notes of berries and citrus.",
    matches: (answers) => answers[0] === 1,
    recommendedBean: "Ethiopian Yirgacheffe",
  },
  {
    name: "The Nutty Delight",
    description: "A rich and nutty coffee with notes of chocolate and almond.",
    matches: (answers) => answers[0] === 2 && answers[4] === 0,
    recommendedBean: "Colombian Supremo",
  },
  {
    name: "The Spice Route",
    description: "A warm and spicy coffee with notes of cinnamon and nutmeg.",
    matches: (answers) => answers[3] === 0,
    recommendedBean: "Sumatran Mandheling",
  },
];
  const quizModal = document.getElementById('quiz-modal');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const nextButton = document.getElementById('quiz-next-btn');
  const closeButton = document.getElementById('quiz-close-btn');
  const openButton = document.getElementById('taste-profile-btn');
  const wheel = document.querySelector('.taste-profile-wheel');

  let currentQuestionIndex = 0;
  const userAnswers = [];

  function determineProfile(answers) {
    for (const profile of tasteProfiles) {
      if (profile.matches(answers)) return profile;
    }
    return tasteProfiles[tasteProfiles.length - 1];
  }

  function clearOptions() {
    quizOptions.innerHTML = '';
  }

  function showQuestion(index) {
    const q = quizData[index];
    quizQuestion.textContent = q.question;
    clearOptions();

    q.options.forEach((option, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = option;
      btn.type = 'button';
      btn.addEventListener('click', () => {
        userAnswers[index] = i; // save answer
        if (currentQuestionIndex < quizData.length - 1) {
          currentQuestionIndex++;
          showQuestion(currentQuestionIndex);
        } else {
          showResults();
        }
      });
      quizOptions.appendChild(btn);
    });
  }

  async function saveTasteProfileToSupabase(profileName, answers) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("User not logged in — can't save taste profile.");
    return;
  }

  const { data: existingProfile, error: existingError } = await supabase
    .from('user_taste_profiles')
    .select('*')
    .eq('user_id', user.id);

  if (existingError) {
    console.error('Error checking existing profile:', existingError);
  } else if (existingProfile.length > 0) {
    // Update existing profile
    const { data, error } = await supabase
      .from('user_taste_profiles')
      .update({
        profile_name: profileName,
        answers: answers,
        updated_at: new Date(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating taste profile:', error);
    } else {
      console.log('Taste profile updated:', data);
    }
  } else {
    // Insert new profile
    const { data, error } = await supabase
      .from('user_taste_profiles')
      .insert({
        user_id: user.id,
        profile_name: profileName,
        answers: answers,
      });

    if (error) {
      console.error('Error saving taste profile:', error);
    } else {
      console.log('Taste profile saved:', data);
    }
  }
}

  function spinWheel(profile) {
    if (wheel) {
      const angle = profile.angle + (360 * 3); // spin 3 times
      wheel.style.transform = `rotate(${angle}deg)`;
    } else {
      console.error("Wheel element not found");
    }
  }

async function showResults() {
  const profile = determineProfile(userAnswers);
  quizQuestion.textContent = `You are ${profile.name}! ${profile.icon}`;
  quizOptions.innerHTML = `<p>${profile.description}</p><p>Thanks for completing the quiz. Your profile helps us recommend coffees you’ll love.</p>`;
  nextButton.style.display = 'none';
  await saveTasteProfileToSupabase(profile.name, userAnswers);
}

  function openQuiz() {
    currentQuestionIndex = 0;
    userAnswers.length = 0;
    nextButton.style.display = 'inline-block';
    quizModal.classList.remove('hidden');  
    showQuestion(currentQuestionIndex);
  }

  function closeQuiz() {
    quizModal.classList.add('hidden');     
  }

  openButton.addEventListener('click', openQuiz);
  nextButton.addEventListener('click', () => {
    if (currentQuestionIndex < quizData.length - 1) {
      currentQuestionIndex++;
      showQuestion(currentQuestionIndex);
    } else {
      showResults();
    }
  });
  closeButton.addEventListener('click', closeQuiz);
}
