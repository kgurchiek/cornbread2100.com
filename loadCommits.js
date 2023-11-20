var accessToken = 'ghp_nf8tOOjB8U692';
accessToken += 'UzbzPOUPA9XlxHMek3MGsNC';

(async () => {
  const commitCount = (await (await fetch('https://api.github.com/repos/landgreen/n-gon/contributors', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })).json())[0].contributions;
  
  var allCommits = [];
  for (var i = 0; i < (commitCount / 100) - 1; i++) {
    const commits = await (await fetch(`https://api.github.com/repos/landgreen/n-gon/commits?per_page=100&page=${i + 1}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })).json();
    allCommits = allCommits.concat(commits)
  }
  const commits = await (await fetch(`https://api.github.com/repos/landgreen/n-gon/commits?per_page=${commitCount % 100}&page=${Math.floor(commitCount / 100)}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })).json();
  allCommits = allCommits.concat(commits);
  allCommits.sort((a, b) => ((new Date(b.commit.author.date)).getTime() - new Date(a.commit.author.date).getTime()));
  
  for (var i = 0; i < allCommits.length; i++) {
    const commit = allCommits[i];
    const commitBox = document.createElement('div');
    commitBox.className = 'box';
    const title = document.createElement('strong');
    title.appendChild(document.createTextNode(`${commitCount - i}: ${commit.commit.message.split('\n')[0]}`))
    commitBox.appendChild(title);
    commitBox.appendChild(document.createElement('br'));
    const date = new Date(Date.parse(commit.commit.author.date));
    commitBox.appendChild(document.createTextNode(`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`))
    commitBox.appendChild(document.createElement('br'));
    commitBox.appendChild(document.createElement('br'));
    commitBox.appendChild(document.createTextNode(commit.commit.message));
    const link = document.createElement('a');
    link.href = `n-gon?commit=${commitCount - i - 1}`;
    link.style = "text-decoration: none; color:white; font-family: 'Helvetica'";
    link.appendChild(commitBox);
    document.body.appendChild(link);
  }

  const mobileCheckbox = document.getElementById('mobileCheckbox');

  mobileCheckbox.addEventListener('change', (event) => {
    if (event.target.checked) {
      for (const button of document.body.children) if (button.children.length > 0 && button.children[0].className == 'box') button.href += '&mobile=true';
    } else {
      for (const button of document.body.children) if (button.children.length > 0 && button.children[0].className == 'box') button.href = button.href.replaceAll('&mobile=true', '');
    }
  });
})();