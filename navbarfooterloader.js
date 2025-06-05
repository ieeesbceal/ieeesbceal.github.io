document.addEventListener("DOMContentLoaded", () => {
    fetch("./Nav_bar.html")
        .then(res => res.text())
        .then(data => {
            document.getElementById("NavBar").innerHTML = data;

            const navContainer = document.querySelector('.nav-container');
            const scrollThreshold = 50;

            window.addEventListener('scroll', () => {
                if (window.scrollY > scrollThreshold) {
                    navContainer.classList.add('scrolled');
                } else {
                    navContainer.classList.remove('scrolled');
                }
            });
        });

    fetch("./Footer.html")
        .then(res => res.text())
        .then(data => {
            document.getElementById("Footer").innerHTML = data;

            const yearSpan = document.getElementById("yr");
            if (yearSpan) {
                yearSpan.textContent = new Date().getFullYear();
            }
        });
});