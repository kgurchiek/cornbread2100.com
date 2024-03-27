function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('active');
  var overlay = document.querySelector('.overlay');
  overlay.classList.toggle('active');
}

(async () => document.getElementById('sidebar').innerHTML = await (await fetch('sidebar.html')).text() )();