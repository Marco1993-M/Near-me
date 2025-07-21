'use client';

import { useEffect } from 'react';

export default function CitiesModalHandler() {
  useEffect(() => {
    const citiesButton = document.getElementById('open-cities');
    const citiesModal = document.getElementById('cities');
    const citySuggestions = document.getElementById('city-suggestions');
    const closeModalBtn = document.getElementById('close-cities');

    const openModal = () => {
      if (citiesModal) {
        citiesModal.classList.remove('hidden');
      }
    };

    const closeModal = () => {
      if (citiesModal) {
        citiesModal.classList.add('hidden');
      }

      if (citySuggestions) {
        citySuggestions.classList.add('hidden');
      }

      const shopResults = document.querySelector('.shop-results');
      if (shopResults) {
        shopResults.remove();
      }

      console.log('Cities modal closed');
    };

    if (citiesButton) citiesButton.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    // Swipe down to close functionality
    let startY = 0;
    let currentY = 0;
    let threshold = 150;
    let swipeDistance = 0;
    let isDragging = false;

    if (citiesModal) {
      citiesModal.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        e.stopPropagation();
      });

      citiesModal.addEventListener('touchmove', (e) => {
        if (isDragging) {
          currentY = e.touches[0].clientY;
          swipeDistance = currentY - startY;

          // ✅ Only prevent default when swiping down from near the top
          if (swipeDistance > 0 && startY < 100) {
            e.preventDefault();
          }

          requestAnimationFrame(() => {
            citiesModal.style.transform = `translateY(${swipeDistance}px)`;
          });

          e.stopPropagation();
        }
      });

      citiesModal.addEventListener('touchend', () => {
        isDragging = false;

        if (swipeDistance > threshold) {
          citiesModal.style.transition = 'transform 0.3s ease-out';
          citiesModal.style.transform = `translateY(${window.innerHeight}px)`;

          setTimeout(() => {
            citiesModal.classList.add('hidden');
            citiesModal.style.transform = '';
            citiesModal.style.transition = '';
            if (citySuggestions) {
              citySuggestions.classList.add('hidden');
            }
            const shopResults = document.querySelector('.shop-results');
            if (shopResults) {
              shopResults.remove();
            }

            console.log('Cities modal closed');
          }, 300);
        } else {
          citiesModal.style.transition = 'transform 0.3s ease-out';
          citiesModal.style.transform = '';
          setTimeout(() => {
            citiesModal.style.transition = '';
          }, 300);
        }

        swipeDistance = 0;
      });
    }

    return () => {
      if (citiesButton) citiesButton.removeEventListener('click', openModal);
      if (closeModalBtn) closeModalBtn.removeEventListener('click', closeModal);
    };
  }, []);

  return null;
}
