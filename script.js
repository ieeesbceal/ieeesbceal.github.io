const API_URL = 'https://script.google.com/macros/s/AKfycbw9MXA3T0vC4bg1Rwqz7DY8xRAEQ8EjaQGLjZR6SEE90QoXvEWEfpsinLvJRUPfrGyaug/exec';

let latestYear = null;

// Count Up Animation Configuration
const countUpConfig = {
  years: {
    element: '.years',
    endValue: 10,
    duration: 2000, // milliseconds
    startDelay: 0   // delay before starting
  },
  members: {
    element: '.members',
    endValue: 5000,
    duration: 3000,
    startDelay: 200
  },
  projects: {
    element: '.projects',
    endValue: 900,
    duration: 2500,
    startDelay: 400
  },
  events: {
    element: '.events',
    endValue: 2000,
    duration: 2800,
    startDelay: 600
  }
};

// Easing function for smooth animation
function easeOutQuart(t) {
  return 1 - (--t) * t * t * t;
}

// Count up animation function
function animateCountUp(config) {
  const element = document.querySelector(config.element);
  if (!element) return;
  
  const startValue = 0;
  const endValue = config.endValue;
  const duration = config.duration;
  const startTime = performance.now() + config.startDelay;
  
  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    
    if (elapsed < 0) {
      requestAnimationFrame(updateCount);
      return;
    }
    
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);
    const currentValue = Math.floor(startValue + (endValue - startValue) * easedProgress);
    
    // Format large numbers with commas
    element.textContent = currentValue.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.textContent = endValue.toLocaleString();
    }
  }
  
  requestAnimationFrame(updateCount);
}

// Initialize all animations
function startCountUpAnimations() {
  Object.values(countUpConfig).forEach(config => {
    animateCountUp(config);
  });
}

function restartAnimations() {
  // Reset all counters to 0
  Object.values(countUpConfig).forEach(config => {
    const element = document.querySelector(config.element);
    if (element) element.textContent = '0';
  });
  
  // Start animations after a brief delay
  setTimeout(startCountUpAnimations, 100);
}

async function FetchPeopleByRoles() {
    let res = await fetch(`${API_URL}?role`);
    let data = await res.json();
    if (!data || !data.people || !Array.isArray(data.people) || data.people.length === 0) {
        return;
    }
    latestYear = data.year; // Save the latest year from API
    CreateCard(data.people);
}
function CreateCard(people) {
    const teamDiv = document.getElementById('team');
    teamDiv.innerHTML = '';
    people.forEach(person => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML = `
        <img class="person-photo" src="${person.photo_url}" alt="${person.Name || ''}" />
        <div class="person-name">${person.Name || ''}</div>
        <div class="person-society">${person.society || ''}</div>
        <div class="person-role">${person.role || ''}</div>
        <div class="person-contact">
        ${person.email ? `<a href="mailto:${person.email}" target="_blank" title="Mail"><i class="fa-solid fa-envelope"></i></a>` : ''}
        ${person.linkedin ? `<a href="https://linkedin.com/in/${person.linkedin}" target="_blank" title="LinkedIn"><i class="fab fa-linkedin"></i></a>` : ''}
        ${person.instagram ? `<a href="https://instagram.com/${person.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
        </div>
        `;
        teamDiv.appendChild(card);
    });
    const executivediv = document.getElementById('executivediv');
    executivediv.style.display = 'block';
}
// document.getElementById('ExecutiveePageBtn').onclick = () => {
//     if (latestYear) {
//         window.location.href = `/execom/index.html?year=${latestYear}`;
//     } else {
//         alert("Year not loaded yet!");
//     }
// };

document.addEventListener("DOMContentLoaded", function () {
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            startCountUpAnimations();
            observer.unobserve(entry.target); // Only animate once
          }
        });
      }, { threshold: 0.5 });

      observer.observe(statsSection);
    }

    FetchPeopleByRoles();
});