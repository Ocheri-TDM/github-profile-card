const input = document.getElementById("usernameInput");
const input2 = document.getElementById("usernameInput2");
const button = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const sortSelect = document.getElementById("sortSelect");
const historyBlock = document.getElementById("history");

const loading = document.getElementById("loading");
const error = document.getElementById("error");
const profile = document.getElementById("profile");
const repos = document.getElementById("repos");
const repoList = document.getElementById("repoList");
const themeBtn = document.getElementById("themeBtn");

const randomUsers = [
  "torvalds",
  "gaearon",
  "yyx990803",
  "sindresorhus",
  "tj",
  "octocat",
  "addyosmani"
];

themeBtn.addEventListener("click", function () {
  document.body.classList.toggle("light");

  if (document.body.classList.contains("light")) {
    themeBtn.textContent = "🌙 Тёмная тема";
  } else {
    themeBtn.textContent = "☀️ Светлая тема";
  }
});

button.addEventListener("click", searchUsers);

input.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    searchUsers();
  }
});

input2.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    searchUsers();
  }
});

randomBtn.addEventListener("click", function () {
  const randomIndex = Math.floor(Math.random() * randomUsers.length);
  input.value = randomUsers[randomIndex];
  input2.value = "";
  searchUsers();
});

sortSelect.addEventListener("change", function () {
  searchUsers();
});

renderHistory();

async function searchUsers() {
  const username1 = input.value.trim();
  const username2 = input2.value.trim();

  if (username1 === "") {
    showError("Введите хотя бы первый username");
    return;
  }

  clearPage();
  loading.classList.remove("hidden");

  try {
    if (username2 !== "") {
      const firstUser = await getUserData(username1);
      const secondUser = await getUserData(username2);

      renderCompare(firstUser, secondUser);

      saveToHistory(username1);
      saveToHistory(username2);
    } else {
      const user = await getUserData(username1);

      renderProfile(user.userData);
      renderRepos(user.reposData);
      renderLanguages(user.languages);

      saveToHistory(username1);
    }

    renderHistory();

  } catch (err) {
    showError(err.message);
  } finally {
    loading.classList.add("hidden");
  }
}

async function getUserData(username) {
  const userResponse = await fetch(`https://api.github.com/users/${username}`);

  if (userResponse.status === 404) {
    throw new Error(`Пользователь ${username} не найден`);
  }

  if (!userResponse.ok) {
    throw new Error("Ошибка при загрузке пользователя");
  }

  const userData = await userResponse.json();

  let sort = sortSelect.value;

  let sortParam = "updated";

  if (sort === "stars") {
    sortParam = "stars";
  }

  if (sort === "created") {
    sortParam = "created";
  }

  const reposResponse = await fetch(
    `https://api.github.com/users/${username}/repos?sort=${sortParam}&per_page=100`
  );

  if (!reposResponse.ok) {
    throw new Error("Ошибка при загрузке репозиториев");
  }

  const allRepos = await reposResponse.json();

  if (sort === "stars") {
    allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  }

  if (sort === "created") {
    allRepos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (sort === "updated") {
    allRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  const reposData = allRepos.slice(0, 5);
  const languages = countLanguages(allRepos);

  return {
    userData,
    reposData,
    languages
  };
}

function countLanguages(repositories) {
  const result = {};

  repositories.forEach(repo => {
    if (repo.language) {
      if (result[repo.language]) {
        result[repo.language]++;
      } else {
        result[repo.language] = 1;
      }
    }
  });

  return Object.entries(result)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function renderProfile(user) {
  profile.innerHTML = `
    <div class="profile-top">
      <div class="avatar-wrap">
        <img class="avatar" src="${user.avatar_url}" alt="Аватар">
      </div>

      <div>
        <h2>${user.name || user.login}</h2>
        <p>${user.bio || "Биография не указана"}</p>
        <a href="${user.html_url}" target="_blank">Открыть GitHub профиль</a>
      </div>
    </div>

    <div class="stats">
      <div class="stat">Репозитории<br>${user.public_repos}</div>
      <div class="stat">Подписчики<br>${user.followers}</div>
      <div class="stat">Подписки<br>${user.following}</div>
    </div>
  `;

  profile.classList.remove("hidden");
}

function renderRepos(repositories) {
  repoList.innerHTML = "";

  repositories.forEach(repo => {
    repoList.innerHTML += `
      <a href="${repo.html_url}" target="_blank" class="repo">
        <h3>${repo.name}</h3>
        <p>${repo.description || "Описание отсутствует"}</p>
        <span class="repo-info">⭐ ${repo.stargazers_count}</span>
      </a>
    `;
  });

  repos.classList.remove("hidden");
}

function renderLanguages(languages) {
  if (languages.length === 0) {
    repoList.innerHTML += `
      <div class="languages">
        <h2>Топ языков</h2>
        <p>Языки не найдены</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="languages">
      <h2>Топ языков</h2>
  `;

  languages.forEach(item => {
    html += `
      <div class="language-item">
        <span>${item[0]}</span>
        <b>${item[1]} реп.</b>
      </div>
    `;
  });

  html += `</div>`;

  repoList.innerHTML += html;
}

function renderCompare(first, second) {
  profile.innerHTML = `
    <div class="compare">
      ${getCompareCard(first.userData, first.languages)}
      ${getCompareCard(second.userData, second.languages)}
    </div>
  `;

  profile.classList.remove("hidden");
  repos.classList.add("hidden");
}

function getCompareCard(user, languages) {
  const mainLanguage = languages.length > 0 ? languages[0][0] : "Не найден";

  return `
    <div class="compare-card">
      <img class="compare-avatar" src="${user.avatar_url}" alt="Аватар">

      <h2>${user.name || user.login}</h2>
      <p>${user.bio || "Биография не указана"}</p>

      <div class="stats compare-stats">
        <div class="stat">Репы<br>${user.public_repos}</div>
        <div class="stat">Подписчики<br>${user.followers}</div>
        <div class="stat">Топ язык<br>${mainLanguage}</div>
      </div>

      <a href="${user.html_url}" target="_blank">Открыть профиль</a>
    </div>
  `;
}

function saveToHistory(username) {
  let history = JSON.parse(localStorage.getItem("githubHistory")) || [];

  history = history.filter(item => item.toLowerCase() !== username.toLowerCase());
  history.unshift(username);

  if (history.length > 5) {
    history = history.slice(0, 5);
  }

  localStorage.setItem("githubHistory", JSON.stringify(history));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("githubHistory")) || [];

  if (history.length === 0) {
    historyBlock.innerHTML = "";
    return;
  }

  let html = `<p>Последние поиски:</p>`;

  history.forEach(username => {
    html += `<button class="history-btn">${username}</button>`;
  });

  historyBlock.innerHTML = html;

  const buttons = document.querySelectorAll(".history-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", function () {
      input.value = btn.textContent;
      input2.value = "";
      searchUsers();
    });
  });
}

function showError(message) {
  loading.classList.add("hidden");
  error.textContent = message;
  error.classList.remove("hidden");
  profile.classList.add("hidden");
  repos.classList.add("hidden");
}

function clearPage() {
  error.classList.add("hidden");
  profile.classList.add("hidden");
  repos.classList.add("hidden");
  profile.innerHTML = "";
  repoList.innerHTML = "";
}