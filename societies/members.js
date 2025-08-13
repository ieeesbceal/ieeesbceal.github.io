document.addEventListener("DOMContentLoaded", function () {
    const url = new URL(window.location.href);
    const society = url.pathname.split('/').slice(-2, -1)[0] || '';
    console.log("Society:", society);
    fetchPeopleBySociety(society);
    // document.querySelector('.landing-content h1').innerHTML = `${society.toUpperCase()}`;
});
async function fetchPeopleBySociety(society) {
    console.log("Fetching data for society:", society);
    let res = await fetch(`/execom/data.json`);
    let data = await res.json();

    if (!data || !data.heading || !data.heading.Society) {
        alert("This year details not updated yet");
        return;
    }
    console.log({ [society]: data.heading.Society[society] })
    CreateSocietySections({ [society]: data.heading.Society[society] } || { [society]: [] });
}

const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.2 });
function observeCards() {
    const cards = document.querySelectorAll('.person-card');
    cards.forEach(card => observer.observe(card));
}

function CreateSocietySections(societies) {
    const teamDiv = document.getElementById('team');
    teamDiv.innerHTML = '';

    Object.keys(societies).forEach(societyName => {
        const societyHeader = document.createElement('h1');
        societyHeader.className = 'society-header';
        societyHeader.textContent = societyName;
        teamDiv.appendChild(societyHeader);

        const societyContainer = document.createElement('div');
        societyContainer.className = 'society-container';

        societies[societyName].forEach((person, idx) => {
            const card = document.createElement('div');
            card.className = 'person-card';
            card.innerHTML = `
                <img class="person-photo" src="/images/execom_2025/${person.photo_url || person.name.toLowerCase().split(' ')[0]}.png" onerror="this.onerror=null; this.src='/images/execom_2025/default.png';" alt="${person.name}" />
                <div class="person-name">${toTitleCase(person.name || '')}</div>
                <div class="person-society">${toUpperCase(person.society || societyName || '')}</div>
                <div class="person-role">${toTitleCase(person.role || '')}</div>
                <div class="person-contact">
                    ${person.email ? `<a href="https://mail.google.com/mail/?view=cm&fs=1&to=${person.email}" target="_blank" title="Mail"><i class="fa-solid fa-envelope"></i></a>` : ''}
                    ${person.linkedin ? `<a href="${person.linkedin}" target="_blank" title="LinkedIn"><i class="fab fa-linkedin"></i></a>` : ''}
                    ${person.instagram ? `<a href="${person.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
                    ${person.github ? `<a href="${person.github}" target="_blank" title="GitHub"><i class="fab fa-github"></i></a>` : ''}
                    ${person.website ? `<a href="${person.website}" target="_blank" title="Website"><i class="fa-solid fa-globe"></i></a>` : ''}
                    ${person.x ? `<a href="${person.x}" target="_blank" title="X"><i class="fab fa-x"></i></a>` : ''}
                    ${person.facebook ? `<a href="${person.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>` : ''}
                </div>
            `;
            societyContainer.appendChild(card);
        });
        teamDiv.appendChild(societyContainer);
    });
    observeCards();
}
