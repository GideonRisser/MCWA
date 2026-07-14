document.addEventListener('DOMContentLoaded', async () => {
  const title = document.querySelector('h1');
  if (title) {
    title.addEventListener('click', () => {
      title.style.transition = 'transform 0.2s ease';
      title.style.transform = 'scale(1.03)';
      setTimeout(() => {
        title.style.transform = 'scale(1)';
      }, 180);
    });
  }

  initDropdown();
  await loadStandings();
  await loadStats();
});

function initDropdown() {
  const menuToggle = document.querySelector('.menu-toggle');
  const dropdownMenu = document.querySelector('.dropdown-menu');

  if (!menuToggle || !dropdownMenu) {
    return;
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = dropdownMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  dropdownMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      dropdownMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown')) {
      dropdownMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

async function loadStandings() {
  const classicalList = document.getElementById('classical-standings');
  const countryList = document.getElementById('country-standings');

  if (!classicalList && !countryList) {
    return;
  }

  try {
    const response = await fetch('data.json');
    if (!response.ok) {
      throw new Error('Unable to load standings.');
    }

    const data = await response.json();
    const teams = Object.values(data.teams || {});

    const classicalTeams = teams.filter((team) => team.league === 'Classical').sort(compareTeams);
    const countryTeams = teams.filter((team) => team.league === 'Country').sort(compareTeams);

    renderStandings(classicalList, classicalTeams);
    renderStandings(countryList, countryTeams);
  } catch (error) {
    if (classicalList) {
      classicalList.innerHTML = `<li>${error.message}</li>`;
    }
    if (countryList) {
      countryList.innerHTML = `<li>${error.message}</li>`;
    }
  }
}

function renderStandings(list, teams) {
  if (!list) {
    return;
  }

  list.innerHTML = '';
  teams.forEach((team) => {
    const item = document.createElement('li');
    const record = team.record || { wins: 0, losses: 0, ties: 0 };
    const recordText = `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}`;
    const link = document.createElement('a');
    link.href = `teams.html?team=${encodeURIComponent(team.name)}`;
    link.textContent = `${team.name} (${recordText})`;
    item.appendChild(link);
    list.appendChild(item);
  });
}

async function loadStats() {
  const list = document.getElementById('stats-list');
  const groupSelect = document.getElementById('stat-group');
  const statSelect = document.getElementById('stat-category');

  if (!list || !groupSelect || !statSelect) {
    return;
  }

  const updateStatOptions = () => {
    const options = getStatOptions(groupSelect.value);
    statSelect.innerHTML = options
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('');
  };

  const render = async () => {
    try {
      const response = await fetch(getDataUrl());
      if (!response.ok) {
        throw new Error('Unable to load stats.');
      }

      const data = await response.json();
      const players = Object.entries(data.players || {}).filter(([, player]) =>
        playerHasGroupStats(player, groupSelect.value)
      );

      const category = statSelect.value;
      const group = groupSelect.value;
      const ranked = [...players].sort((a, b) =>
        comparePlayerStats(a[1], b[1], group, category)
      );
      const topThree = ranked.slice(0, 3);

      list.innerHTML = '';
      if (!topThree.length) {
        list.innerHTML = '<li>No players available for this category.</li>';
        return;
      }

      topThree.forEach(([playerKey, player]) => {
        const item = document.createElement('li');
        const value = formatStatValue(player, group, category);
        const link = document.createElement('a');
        link.href = `player.html?player=${encodeURIComponent(playerKey)}`;
        link.textContent = player.name;
        item.appendChild(link);
        item.appendChild(document.createTextNode(` — ${value}`));
        list.appendChild(item);
      });
    } catch (error) {
      list.innerHTML = `<li>${error.message}</li>`;
    }
  };

  groupSelect.addEventListener('change', () => {
    updateStatOptions();
    render();
  });

  statSelect.addEventListener('change', render);

  updateStatOptions();
  await render();
}

function getStatOptions(group) {
  if (group === 'pitching') {
    return [
      { value: 'era', label: 'Earned Run Average' },
      { value: 'k', label: 'Strikeouts' }
    ];
  }

  return [
    { value: 'hr', label: 'Homeruns' },
    { value: 'rbi', label: 'RBIs' },
    { value: 'avg', label: 'Batting Average' },
    { value: 'obp', label: 'On Base Percentage' }
  ];
}

function playerHasGroupStats(player, group) {
  if (group === 'pitching') {
    return Boolean(
      player.stats?.pitching || player.k != null || player.er != null || player.ip != null
    );
  }
  return Boolean(
    player.stats?.batting ||
      player.hr != null ||
      player.rbi != null ||
      player.hits != null ||
      player.abs != null ||
      player.walks != null
  );
}

function getBattingStats(player) {
  return (
    player.stats?.batting ||
    {
      hr: player.hr,
      rbi: player.rbi,
      hits: player.hits,
      abs: player.abs,
      walks: player.walks
    }
  );
}

function getPitchingStats(player) {
  return (
    player.stats?.pitching ||
    {
      er: player.er,
      ip: player.ip,
      k: player.k
    }
  );
}

function comparePlayerStats(a, b, group, category) {
  const aValue = getPlayerStatValue(a, group, category);
  const bValue = getPlayerStatValue(b, group, category);

  if (aValue === bValue) {
    return a.name.localeCompare(b.name);
  }

  if (category === 'era') {
    return aValue - bValue;
  }

  return bValue - aValue;
}

function getPlayerStatValue(player, group, category) {
  const stats = group === 'pitching' ? getPitchingStats(player) : getBattingStats(player);

  if (group === 'pitching') {
    if (category === 'era') {
      return calculateEarnedRunAverage(stats.er, stats.ip);
    }
    return stats.k || 0;
  }

  if (category === 'avg') {
    return calculateBattingAverage(stats.hits, stats.abs);
  }

  if (category === 'obp') {
    return calculateOnBasePercentage(stats.hits, stats.abs, stats.walks);
  }

  if (category === 'rbi') {
    return stats.rbi || 0;
  }

  return stats.hr || 0;
}

function formatStatValue(player, group, category) {
  const stats = group === 'pitching' ? getPitchingStats(player) : getBattingStats(player);

  if (group === 'pitching') {
    if (category === 'era') {
      return `${calculateEarnedRunAverage(stats.er, stats.ip).toFixed(2)} ERA`;
    }
    return `${stats.k || 0} K`;
  }

  if (category === 'avg') {
    return calculateBattingAverage(stats.hits, stats.abs).toFixed(3);
  }

  if (category === 'obp') {
    return calculateOnBasePercentage(stats.hits, stats.abs, stats.walks).toFixed(3);
  }

  if (category === 'rbi') {
    return `${stats.rbi || 0} RBI`;
  }

  return `${stats.hr || 0} HR`;
}

function calculateEarnedRunAverage(er, ip) {
  if (!ip) {
    return Number.POSITIVE_INFINITY;
  }
  return (er * 9) / ip;
}

function calculateBattingAverage(hits, abs) {
  if (!abs) {
    return 0;
  }
  return hits / abs;
}

function calculateOnBasePercentage(hits, abs, walks) {
  if (!abs) {
    return 0;
  }
  return (hits + walks) / (abs + walks);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getDataUrl() {
  const path = window.location.pathname;
  return path.includes('/teams/') ? '../data.json' : 'data.json';
}

function compareTeams(a, b) {
  const aGames = (a.record?.wins || 0) + (a.record?.losses || 0) + (a.record?.ties || 0);
  const bGames = (b.record?.wins || 0) + (b.record?.losses || 0) + (b.record?.ties || 0);
  const aPct = aGames ? ((a.record?.wins || 0) + (a.record?.ties || 0) * 0.5) / aGames : -1;
  const bPct = bGames ? ((b.record?.wins || 0) + (b.record?.ties || 0) * 0.5) / bGames : -1;

  if (bPct !== aPct) {
    return bPct - aPct;
  }

  const aWins = a.record?.wins || 0;
  const bWins = b.record?.wins || 0;
  if (bWins !== aWins) {
    return bWins - aWins;
  }

  const aLosses = a.record?.losses || 0;
  const bLosses = b.record?.losses || 0;
  if (aLosses !== bLosses) {
    return aLosses - bLosses;
  }

  return a.name.localeCompare(b.name);
}
