// Model v4: interaction + visual draft affordances.
// - Recommendation cards are clickable draft actions.
// - Card art is loaded from RoyaleAPI's public static asset repository.
// - Model score is reinforced with a red -> neutral -> green background tint.

const CARD_ART_BASE_V4 = 'https://royaleapi.github.io/cr-api-assets/cards';

function cardArtKeyV4(card){
  return card
    .toLowerCase()
    .replace(/&/g,'and')
    .replace(/p\.e\.k\.k\.a/g,'pekka')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

function cardArtUrlV4(card){
  return `${CARD_ART_BASE_V4}/${cardArtKeyV4(card)}.png`;
}

function cardIconV4(card, className='card-icon'){
  const safe = card.replace(/"/g,'&quot;');
  return `<img class="${className}" src="${cardArtUrlV4(card)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'" data-card-art="${safe}" />`;
}

function scoreHeatV4(score){
  const delta = clamp(score - 50,-30,30);
  const strength = Math.min(1,Math.abs(delta)/22);
  const hue = delta >= 0 ? 145 : 0;
  const alpha = 0.035 + strength*0.22;
  const border = 0.20 + strength*0.34;
  return `--heat-hue:${hue};--heat-alpha:${alpha.toFixed(3)};--heat-border:${border.toFixed(3)};`;
}

function recommendationButtonV4(r,i){
  const safe = r.card.replace(/"/g,'&quot;');
  return `
    <button type="button" class="recommendation-card draft-recommendation score-heat" data-card="${safe}" style="${scoreHeatV4(r.score)}" title="Draft ${safe}">
      <div class="recommendation-art-wrap">${cardIconV4(r.card,'recommendation-icon')}</div>
      <div class="recommendation-copy">
        <div class="rec-rank">#${i+1} · CWR ${r.cwr}%${PATCH_PRIOR[r.card] ? ' · patch adjusted' : ''}</div>
        <div class="rec-name-row"><span class="rec-name">${r.card}</span><span class="score">${Math.round(r.score)}</span></div>
        <div class="reason">${reasons(r)}</div>
        <div class="score-bar"><span style="width:${r.score}%"></span></div>
        <div class="chips">${componentChips(r)}</div>
      </div>
    </button>`;
}

renderRecommendations = function(side){
  const ranked = rankFor(side).slice(0,8);
  $('recommendationTitle').textContent = side === 'you' ? 'Best available picks' : 'Opponent danger board';
  $('recommendationEyebrow').textContent = side === 'you' ? 'Decision support' : 'Anticipate their turn';
  $('recommendationList').innerHTML = ranked.map(recommendationButtonV4).join('');
  document.querySelectorAll('.draft-recommendation').forEach(btn=>{
    btn.addEventListener('click',()=>pickCard(btn.dataset.card));
  });
};

renderPool = function(side,finished=false){
  const q = norm($('cardSearch').value || '');
  const own = side === 'you' ? state.you : state.opp;
  const slotOpen = championSlotOpenV3(own);
  const scoreMap = finished ? new Map() : new Map(rankFor(side).map(r=>[r.card,r]));
  const cards = state.remaining.filter(c=>!q || norm(c).includes(q));
  $('remainingCount').textContent = state.remaining.length;

  $('poolGrid').innerHTML = cards.map(c=>{
    const unavailable = !finished && has(c,'champion') && !slotOpen;
    const r = scoreMap.get(c);
    const tags = cardTags(c).slice(0,3).map(t=>t.replace(/([A-Z])/g,' $1').toLowerCase()).join(' · ') || 'neutral metadata';
    const score = r ? `<span class="mini-score">${Math.round(r.score)}</span>` : '';
    const suffix = unavailable ? ' · slot filled' : '';
    const heat = r ? scoreHeatV4(r.score) : '--heat-hue:210;--heat-alpha:.02;--heat-border:.18;';
    return `<button type="button" class="pool-card score-heat ${unavailable?'slot-unavailable':''}" style="${heat}" data-card="${c.replace(/"/g,'&quot;')}" ${(finished || unavailable)?'disabled':''}>
      ${cardIconV4(c,'pool-card-icon')}
      <span class="pool-card-copy">${score}<strong>${c}</strong><small>${cost(c)} elixir · ${tags}${suffix}</small></span>
    </button>`;
  }).join('');

  if(!finished){
    document.querySelectorAll('.pool-card:not(:disabled)').forEach(btn=>btn.addEventListener('click',()=>pickCard(btn.dataset.card)));
  }
};

renderDeck = function(side){
  const deck = state[side];
  $(side+'Count').textContent = deck.length;
  $(side+'Avg').textContent = `${avg(deck).toFixed(1)} elixir`;
  const target = $(side+'Deck');
  target.classList.toggle('empty-state',!deck.length);
  target.innerHTML = deck.length
    ? deck.map(c=>`<span class="deck-card with-icon">${cardIconV4(c,'deck-card-icon')}<span>${c}</span></span>`).join('')
    : 'No cards drafted yet.';

  const champion = championInDeckV3(deck);
  const cov = coverage(deck);
  const slot = champion
    ? `<div class="hero-slot filled"><span>Champion / Hero slot</span><strong class="hero-slot-card">${cardIconV4(champion,'hero-slot-icon')} ${champion}</strong><small>Filled · max 1</small></div>`
    : `<div class="hero-slot open"><span>Champion / Hero slot</span><strong>Open</strong><small>Optional · only a mild tiebreaker</small></div>`;

  $(side+'Strategy').innerHTML = `${slot}<strong>${inferredStrategy(deck)}</strong><div class="coverage">${cov.map(([n,ok])=>`<span class="${ok?'covered':'missing'}">${ok?'✓':'!'} ${n}</span>`).join('')}</div>`;
};
