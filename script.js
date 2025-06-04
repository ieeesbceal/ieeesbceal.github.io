document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("yr").textContent = new Date().getFullYear();
  const navContainer = document.querySelector('.nav-container');
  const scrollThreshold = 50;

  function handleScroll() {
    console.log(window.scrollY); // You should see this log when scrolling now
    if (window.scrollY > scrollThreshold) {
      navContainer.classList.add('scrolled');
    } else {
      navContainer.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll);
});

