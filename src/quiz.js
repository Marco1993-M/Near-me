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

function recommendCoffee(answers) {
  const sweetness = answers[2];
  const flavorNotes = answers[0];
  const spice = answers[3];

  if (sweetness === 0 && flavorNotes === 0) {
    return "Nicaragua Matagalpa - smooth, rich, and sweet with chocolate flavors and nutty notes";
  } else if (flavorNotes === 1) {
    return "Ethiopia Yirgacheffe - bright floral aroma and smooth body with sweet, fragrant flavors";
  } else if (spice === 0) {
    return "Sumatra Mandheling - heavy, complex, and syrupy with low acidity and earthy notes";
  } else if (flavorNotes === 2 && answers[4] === 0) {
    return "Colombia Hacienda Guayabal - smooth and balanced with notes of chocolate and caramel";
  } else {
    return "Guatemala Antigua - well-balanced cup with smoky flavor and chocolaty aroma";
  }
}

  async function showExistingProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("User not logged in — can't retrieve taste profile.");
      return;
    }

    const { data: existingProfile, error } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error retrieving taste profile:', error);
    } else if (existingProfile.length > 0) {
      const profile = existingProfile[0];
      quizQuestion.textContent = `Your taste profile: ${profile.profile_name}`;
     quizOptions.innerHTML = `
        <p>Your profile: ${profile.profile_name}</p>
        <p>We recommend a ${recommendCoffee(profile.answers)} coffee for you!</p>
        <button id="retake-quiz-btn" class="quiz-option">Take the quiz again</button>
      `;

      const retakeQuizBtn = document.getElementById('retake-quiz-btn');
      retakeQuizBtn.addEventListener('click', () => {
        openQuiz();
      });

      nextButton.style.display = 'none';
      quizModal.classList.remove('hidden');
    } else {
      openQuiz();
    }
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

  openButton.addEventListener('click', showExistingProfile);
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
