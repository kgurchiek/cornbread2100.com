function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('active');
  var overlay = document.querySelector('.overlay');
  overlay.classList.toggle('active');
}

var xhr = new XMLHttpRequest();
xhr.open('GET', 'sidebar.html', true);
xhr.onreadystatechange = function() {
    if (this.readyState !== 4) return;
    if (this.status !== 200) return; // or whatever error handling you want to do
    document.getElementById('sidebar').innerHTML = this.responseText;
};
xhr.send();