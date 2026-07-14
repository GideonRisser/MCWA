document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const requestedTeam = params.get('team') || 'Beethoven';
  const teamNameEl = document.getElementById('team-name');
  const teamMetaEl = document.getElementById('team-meta');
  const recordValueEl = document.getElementById('record-value');
  const leagueValueEl = document.getElementById('league-value');
  const avgValueEl = document.getElementById('team-avg-value');
  const eraValueEl = document.getElementById('team-era-value');
  const recordRowValueEl = document.getElementById('record-row-value');
  const leagueRowValueEl = document.getElementById('league-row-value');
  const avgRowValueEl = document.getElementById('team-avg-row-value');
  const eraRowValueEl = document.getElementById('team-era-row-value');
  const rosterList = document.getElementById('roster-list');
  const scheduleList = document.getElementById('schedule-list');
  const statusMessage = document.getElementById('team-status-message');
  const teamInitialsEl = document.getElementById('team-initials');

  if (!teamNameEl || !teamMetaEl || !recordValueEl || !leagueValueEl || !avgValueEl || !eraValueEl || !rosterList || !scheduleList || !statusMessage || !teamInitialsEl) {
    return;
  }

  try {
    const response = await fetch(getDataUrl());
    if (!response.ok) {
      throw new Error('Unable to load team data.');
    }

    const data = await response.json();
    const teamEntry = findTeamEntry(data.teams || {}, requestedTeam);

    if (!teamEntry) {
      renderEmptyState(requestedTeam);
      return;
    }

    const teamName = teamEntry.name;
    const team = data.teams?.[teamName] || teamEntry;
    const roster = Object.entries(data.players || {})
      .filter(([, player]) => player.team === teamName)
      .map(([key, player]) => ({ key, ...player }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const battingStats = roster.reduce(
      (acc, player) => {
        const batting = player.stats?.batting || {};
        acc.hits += batting.hits || 0;
        acc.abs += batting.abs || 0;
        acc.walks += batting.walks || 0;
        return acc;
      },
      { hits: 0, abs: 0, walks: 0 }
    );

    const pitchingStats = roster.reduce(
      (acc, player) => {
        const pitching = player.stats?.pitching || {};
        acc.er += pitching.er || 0;
        acc.ip += pitching.ip || 0;
        return acc;
      },
      { er: 0, ip: 0 }
    );

    const battingAverage = battingStats.abs ? battingStats.hits / battingStats.abs : 0;
    const era = pitchingStats.ip ? (pitchingStats.er * 9) / pitchingStats.ip : 0;

    teamNameEl.textContent = teamName;
    teamMetaEl.textContent = `${team.league || 'League'} • ${teamName}`;
    recordValueEl.textContent = formatRecord(team.record);
    leagueValueEl.textContent = team.league || '—';
    avgValueEl.textContent = battingStats.abs ? battingAverage.toFixed(3) : '—';
    eraValueEl.textContent = pitchingStats.ip ? era.toFixed(2) : '—';
    recordRowValueEl.textContent = formatRecord(team.record);
    leagueRowValueEl.textContent = team.league || '—';
    avgRowValueEl.textContent = battingStats.abs ? battingAverage.toFixed(3) : '—';
    eraRowValueEl.textContent = pitchingStats.ip ? era.toFixed(2) : '—';
    teamInitialsEl.textContent = getInitials(teamName);

    renderList(rosterList, roster, (player) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `player.html?player=${encodeURIComponent(player.key)}`;
      link.textContent = `${player.name} (#${player.number})`;
      item.appendChild(link);
      return item;
    }, 'No players listed yet.');

    const schedule = team.schedule || [];
    renderList(scheduleList, schedule, (game) => {
      const item = document.createElement('li');
      item.textContent = game;
      return item;
    }, 'No schedule available yet.');

    statusMessage.textContent = `${teamName} • ${formatRecord(team.record)} • ${team.league || 'League'}`;
  } catch (error) {
    renderEmptyState(requestedTeam, error.message);
  }

  function renderEmptyState(teamQuery, message) {
    teamNameEl.textContent = 'Team not found';
    teamMetaEl.textContent = 'No matching team data was found.';
    recordValueEl.textContent = '—';
    leagueValueEl.textContent = '—';
    avgValueEl.textContent = '—';
    eraValueEl.textContent = '—';
    recordRowValueEl.textContent = '—';
    leagueRowValueEl.textContent = '—';
    avgRowValueEl.textContent = '—';
    eraRowValueEl.textContent = '—';
    teamInitialsEl.textContent = '?';
    renderList(rosterList, [], () => null, 'No roster available.');
    renderList(scheduleList, [], () => null, 'No schedule available.');
    statusMessage.textContent = message || `No team data found for “${teamQuery}”.`;
  }

  function renderList(list, items, buildItem, emptyText) {
    list.innerHTML = '';

    if (!items.length) {
      const item = document.createElement('li');
      item.textContent = emptyText;
      list.appendChild(item);
      return;
    }

    items.forEach((itemData) => {
      const item = buildItem(itemData);
      if (item) {
        list.appendChild(item);
      }
    });
  }

  function formatRecord(record) {
    if (!record) {
      return '0-0';
    }

    return `${record.wins || 0}-${record.losses || 0}${record.ties ? `-${record.ties}` : ''}`;
  }

  function getDataUrl() {
    const path = window.location.pathname;
    return path.includes('/teams/') ? '../data.json' : 'data.json';
  }

  function findTeamEntry(teams, query) {
    const normalizedQuery = slugify(query || '');

    if (!teams) {
      return null;
    }

    const exactMatch = Object.entries(teams).find(([key, team]) => {
      return key === query || team.name === query || slugify(team.name) === normalizedQuery || slugify(key) === normalizedQuery;
    });

    if (exactMatch) {
      return { key: exactMatch[0], ...exactMatch[1] };
    }

    return null;
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
});
