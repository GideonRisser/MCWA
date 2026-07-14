document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('player') || 'grisser';
  const statusMessage = document.getElementById('status-message');
  const playerName = document.getElementById('player-name');
  const statsViewSelect = document.getElementById('stats-view');

  if (!playerName || !statusMessage || !statsViewSelect) {
    return;
  }

  statsViewSelect.addEventListener('change', () => {
    updateSnapshotView(statsViewSelect.value);
  });

  await loadPlayer(query);

  async function loadPlayer(playerKey) {
    try {
      const response = await fetch(getDataUrl());
      if (!response.ok) {
        throw new Error('Unable to load data file.');
      }

      const data = await response.json();
      const player = data.players?.[playerKey];

      if (!player) {
        renderEmptyState(playerKey);
        return;
      }

      renderPlayer(player, playerKey, data.teams || {});
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  }

  function renderPlayer(player, playerKey, teams) {
    const batting = player.stats?.batting || {};
    const pitching = player.stats?.pitching || {};

    setText('player-name', player.name);
    setText('player-meta', `${player.team} • #${player.number} • ${player.hand}`);
    setText('team-value', player.team);
    setText('number-value', player.number);
    setText('hand-value', player.hand);
    setText('hr-value', batting.hr ?? '—');
    setText('hits-value', batting.hits ?? '—');
    setText('abs-value', batting.abs ?? '—');
    setText('walks-value', batting.walks ?? '—');
    setText('rbi-detail-value', batting.rbi ?? '—');
    setText('avg-value', batting.abs ? calculateBattingAverage(batting.hits, batting.abs).toFixed(3) : '—');
    setText('obp-value', batting.abs ? calculateOnBasePercentage(batting.hits, batting.abs, batting.walks).toFixed(3) : '—');
    setText('era-value', pitching.ip ? calculateEarnedRunAverage(pitching.er, pitching.ip).toFixed(2) : '—');
    setText('k-value', pitching.k ?? '—');
    setText('ip-value', pitching.ip ?? '—');
    setText('era-card-value', pitching.ip ? calculateEarnedRunAverage(pitching.er, pitching.ip).toFixed(2) : '—');
    setText('player-initials', getInitials(player.name));
    updatePlayerCardVisibility(batting, pitching);
    updateStatsViewControl(batting, pitching);

    const teamInfo = teams[player.team];
    if (teamInfo?.record) {
      statusMessage.textContent = `${player.name} • ${player.team} • ${teamInfo.record.wins}-${teamInfo.record.losses}${teamInfo.record.ties ? `-${teamInfo.record.ties}` : ''}`;
    } else {
      statusMessage.textContent = `Loaded ${player.name} from ${playerKey}.`;
    }
  }

  function renderEmptyState(playerKey) {
    setText('player-name', 'Player not found');
    setText('player-meta', 'No matching player data was found.');
    setText('team-value', '—');
    setText('number-value', '—');
    setText('hand-value', '—');
    setText('hr-value', '—');
    setText('hits-value', '—');
    setText('abs-value', '—');
    setText('walks-value', '—');
    setText('rbi-detail-value', '—');
    setText('avg-value', '—');
    setText('obp-value', '—');
    setText('era-value', '—');
    setText('k-value', '—');
    setText('ip-value', '—');
    setText('era-card-value', '—');
    setText('player-initials', '?');
    updatePlayerCardVisibility({}, {});
    updateStatsViewControl({}, {});
    statusMessage.textContent = `No player data found for “${playerKey}”.`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function getDataUrl() {
    const path = window.location.pathname;
    return path.includes('/teams/') ? '../data.json' : 'data.json';
  }

  function calculateBattingAverage(hits, abs) {
    if (!abs) {
      return 0;
    }
    return hits / abs;
  }

  function calculateEarnedRunAverage(er, ip) {
    if (!ip) {
      return 0;
    }
    return (er * 9) / ip;
  }

  function updateSnapshotView(view) {
    document.querySelectorAll('.batting-row').forEach((row) => {
      row.style.display = view === 'batting' ? '' : 'none';
    });
    document.querySelectorAll('.pitching-row').forEach((row) => {
      row.style.display = view === 'pitching' ? '' : 'none';
    });
  }

  function updateStatsViewControl(batting, pitching) {
    const viewRow = document.getElementById('stats-view-row');
    const hasBatting = Boolean(batting && Object.keys(batting).length);
    const hasPitching = Boolean(pitching && Object.keys(pitching).length);

    if (!viewRow) {
      return;
    }

    if (hasBatting && hasPitching) {
      viewRow.style.display = '';
      statsViewSelect.value = 'batting';
    } else if (hasPitching) {
      viewRow.style.display = 'none';
      statsViewSelect.value = 'pitching';
    } else {
      viewRow.style.display = 'none';
      statsViewSelect.value = 'batting';
    }

    updateSnapshotView(statsViewSelect.value);
  }

  function updatePlayerCardVisibility(batting, pitching) {
    const hrCard = document.getElementById('hr-card');
    const eraCard = document.getElementById('era-card');
    const hasBatting = Boolean(batting && Object.keys(batting).length);
    const hasOnlyPitching = !hasBatting && Boolean(pitching && Object.keys(pitching).length);

    if (hrCard) {
      hrCard.style.display = hasBatting ? '' : 'none';
    }
    if (eraCard) {
      eraCard.style.display = hasOnlyPitching ? '' : 'none';
    }
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
