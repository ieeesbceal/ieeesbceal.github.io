document.addEventListener("DOMContentLoaded", () => {
  // Load navbar from site root
  fetch("/nav-bar.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("NavBar").innerHTML = data;

      const navContainer = document.querySelector(".nav-container");
      const hamburger = document.querySelector(".hamburger");
      const navhold = document.querySelector(".navhold");
      const scrollThreshold = 50;

      const currentPath =  window.location.pathname;
      console.log("Current Path:", currentPath);
      // Remove active from all redirect-links
      document.querySelectorAll(".redirect-link").forEach((link) => {
        link.classList.remove("active");
      });
      // Add active to the matching link
      const activeLink = document.querySelector(
        `.redirect-link[href="${currentPath}"]`
      );
      if (activeLink) {
        activeLink.classList.add("active");
      }

      hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navhold.classList.toggle("active");
      });

      // Mobile dropdown toggle
      const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

      dropdownToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => {
          if (window.innerWidth <= 1100) {
            e.preventDefault();
            const dropdown = toggle.parentElement;
            const openedDropdowns =
              document.querySelectorAll(".dropdown.active");
            openedDropdowns.forEach((openedDropdown) => {
              if (openedDropdown !== dropdown) {
                openedDropdown.classList.remove("active");
              }
            });
            dropdown.classList.toggle("active");
          }
        });
      });

      // Close mobile menu when clicking outside
      document.addEventListener("click", (e) => {
        if (window.innerWidth <= 1100) {
          if (!navhold.contains(e.target) && !hamburger.contains(e.target)) {
            hamburger.classList.remove("active");
            navhold.classList.remove("active");

            // Close all dropdowns
            document.querySelectorAll(".dropdown").forEach((dropdown) => {
              dropdown.classList.remove("active");
            });
          }
        }
      });

      window.addEventListener("scroll", () => {
        if (window.scrollY > scrollThreshold) {
          navContainer.classList.add("scrolled");
        } else {
          navContainer.classList.remove("scrolled");
        }
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 1100) {
          hamburger.classList.remove("active");
          navhold.classList.remove("active");

          // Close all mobile dropdowns
          document.querySelectorAll(".dropdown").forEach((dropdown) => {
            dropdown.classList.remove("active");
          });
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
