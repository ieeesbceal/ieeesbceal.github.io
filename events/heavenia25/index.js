AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });

/* PARALLAX */
(function () {
    const layers = document.querySelectorAll('.parallax-layer');
    function onScroll() {
        const scroll = window.scrollY;
        layers.forEach(l => {
            const speed = parseFloat(l.dataset.speed) || (l.classList.contains('bg') ? 0.22 : 0.06);
            l.style.transform = `translate3d(0, ${scroll * speed}px, 0)`;
        });
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
})();

/* MARQUEE clone: repeat track to ensure continuous movement */
// Built via CSS animation with duplicated text.

/* COUNTERS - animate when visible */
(function () {
    const counters = document.querySelectorAll('.num');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const el = e.target;
                const target = +el.dataset.target;
                let start = 0;
                const step = Math.max(1, Math.floor(target / 80));
                const iv = setInterval(() => {
                    start += step;
                    if (start >= target) { el.textContent = target; clearInterval(iv); }
                    else el.textContent = start;
                }, 18);
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.6 });
    counters.forEach(c => obs.observe(c));
})();

/* Tabs for 2-day schedule + render timetable rows */
(function () {
    const dayTabs = document.querySelectorAll('.tabs .tab');
    const timetableGrid = document.getElementById('timetableGrid');

    const schedule = {
        1: [
            ["8:15 AM - 9:00 AM", "Welcome & Registration"],
            ["9:00 AM - 9:45 AM", "Grand Inauguration: Inspiring opening address"],
            ["9:45 AM - 1:00 PM", "Expert-Led Specialized Tracks: Concurrent Sessions"],
            ["1:00 PM - 2:30 PM", "Networking Luncheon: Lunch with fellow delegates"],
            ["2:30 PM - 3:30 PM", "Interactive Networking Forum"],
            ["3:30 PM - 5:00 PM", "Elevate Your Career: The Power of IEEE Membership"],
            ["5:00 PM - 5:30 PM", "Closing Remarks of the Day"]
        ],
        2: [
            ["9:15 AM - 10:15 AM", "Sustainability in Every Thread: A Session by Naeth"],
            ["10:15 AM - 12:15 PM", "Professional Development Workshops"],
            ["12:15 PM - 1:30 PM", "Networking Lunch"],
            ["1:30 PM - 3:30 PM", "Treasure Hunt: Interactive Team Challenge"],
            ["4:00 PM - 5:25 PM", "Cultural Program & Showcase"],
            ["5:25 PM - 6:00 PM", "Closing Ceremony & Vote of Thanks"]
        ]
    };

    function render(day) {
        timetableGrid.innerHTML = '';
        const rows = schedule[day];
        rows.forEach(r => {
            const row = document.createElement('div'); row.className = 'tt-row';
            const t = document.createElement('div'); t.className = 'tt-time'; t.textContent = r[0];
            const a = document.createElement('div'); a.className = 'tt-activity'; a.textContent = r[1];
            row.appendChild(t); row.appendChild(a); timetableGrid.appendChild(row);
        });
    }

    dayTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            dayTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const day = tab.dataset.day;
            render(day);
        });
    });

    // init day 1 default
    render(1);
})();

/* Flip card keyboard accessibility: toggle on Enter */
document.querySelectorAll('.flip-card').forEach(fc => {
    fc.tabIndex = 0;
    fc.addEventListener('keydown', e => {
        if (e.key === 'Enter') fc.querySelector('.flip-inner').classList.toggle('flipped');
    });
});

/* FAQ accordion */
document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => item.classList.toggle('open'));
    item.addEventListener('keydown', e => { if (e.key === 'Enter') item.classList.toggle('open'); });
});

/* Lightbox for images */
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('click', (e) => {
        // avoid activating for small UI icons (we only have content images here)
        if (img.closest('header') || img.closest('nav')) return;
        const src = img.getAttribute('src');
        if (!src) return;
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed'; overlay.style.inset = 0; overlay.style.background = 'rgba(0,0,0,.9)'; overlay.style.display = 'flex';
        overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = 9999;
        const im = document.createElement('img'); im.src = src; im.style.maxWidth = '92%'; im.style.maxHeight = '92%';
        im.style.borderRadius = '8px'; overlay.appendChild(im);
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    });
});

/* Registration handler (demo) */
function handleRegistration() {
    const form = document.getElementById('regForm');
    const data = new FormData(form);
    const name = data.get('name') || 'Guest';
    const ticket = data.get('ticket') || 'Classic';
    const qty = data.get('qty') || '1';
    alert(`Thank you ${name}!\n\nRegistered: ${ticket} (${qty})\nWe will contact you with payment details.`);
    form.reset();
    // scroll to contact to simulate next step
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
}

/* smooth scroll for nav anchors */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (href.length > 1) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const track = document.getElementById("carouselTrack");
    const cards = track.children;
    const cloneCount = Math.min(cards.length, 3); // how many to duplicate for smooth loop

    for (let i = 0; i < cloneCount; i++) {
        const clone = cards[i].cloneNode(true);
        track.appendChild(clone);
    }
});

const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');

// Get the desktop navigation element
const desktopNav = document.getElementById('desktopNav');

// Function to check screen width and toggle desktop nav visibility
const checkScreenWidth = () => {
    if (window.innerWidth <= 768) { // Assuming 768px is your mobile breakpoint
        desktopNav.style.display = 'none';
    } else {
        desktopNav.style.display = 'flex';
    }
};

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('active');
});

// Optional: close menu on link click
document.querySelectorAll('.mobile-nav a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('active');
    });
});

// Initial check on page load
checkScreenWidth();
// Listen for window resize events
window.addEventListener('resize', checkScreenWidth);

// video section
document.querySelectorAll(".video-box").forEach(box => {
    box.addEventListener("click", () => {
        const videoUrl = box.getAttribute("data-video");
        box.innerHTML = `<iframe src="${videoUrl}" 
        frameborder="0" 
        allow="autoplay; encrypted-media" 
        allowfullscreen></iframe>`;
    });
});

// dynamic footer
document.getElementById("year").textContent = new Date().getFullYear();


function copyNumber(e, number) {
    // On desktop, override "tel:" so it copies instead
    if (!/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        e.preventDefault();
        navigator.clipboard.writeText(number).then(() => {
            alert("Number copied: " + number);
        });
    }
}