document.addEventListener("DOMContentLoaded", () => {
  // Load navbar from site root
  fetch("/nav-bar.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("NavBar").innerHTML = data;

      const navContainer = document.querySelector(".nav-container");
      const scrollThreshold = 50;

      window.addEventListener("scroll", () => {
        if (window.scrollY > scrollThreshold) {
          navContainer.classList.add("scrolled");
        } else {
          navContainer.classList.remove("scrolled");
        }
      });
    });

  // Load footer from site root
  fetch("/footer.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("Footer").innerHTML = data;

      const yearSpan = document.getElementById("yr");
      if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
      }
    });
});
