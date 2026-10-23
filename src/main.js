document.querySelector("#year").textContent = new Date().getFullYear();
document.documentElement.classList.add('js-ready');

const navLinks = document.querySelectorAll('.nav a');
const sections = [...navLinks].map((link) => document.querySelector(link.getAttribute('href')));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-35% 0px -55% 0px' });

sections.forEach((section) => section && observer.observe(section));

const journey = document.querySelector('#journey');
const journeyCanvas = journey.querySelector('.journey-canvas');
const journeyAvatar = journey.querySelector('.journey-avatar');
const avatarSvg = journeyAvatar.querySelector('.student-avatar');
const journeyCards = [...journey.querySelectorAll('.journey-card')];
const journeyStops = [...journey.querySelectorAll('.journey-stop')];
const journeyStatus = document.querySelector('#journey-status');
const replayButton = journey.querySelector('.journey-replay');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let journeyFrame = 0;
let journeyPause = 0;
let journeyRunId = 0;
let journeyPath = null;
let journeyLengths = [];
let journeyPosition = 0;

const journeyRoadObserver = new IntersectionObserver(([entry], currentObserver) => {
  if (!entry.isIntersecting) return;
  journey.classList.add('is-visible');
  playJourney();
  currentObserver.disconnect();
}, { threshold: 0.12 });

journeyRoadObserver.observe(journey);

const milestoneObserver = new IntersectionObserver((entries, currentObserver) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.closest('.journey-stop').classList.add('is-visible');
    currentObserver.unobserve(entry.target);
  });
}, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('.journey-card').forEach((card) => milestoneObserver.observe(card));

function getActiveJourneyPath() {
  return [...journey.querySelectorAll('.journey-road path[id^="journey-route"]')]
    .find((path) => path.getClientRects().length > 0);
}

function pathPointInCanvas(path, distance, canvasRect, matrix = path.getScreenCTM()) {
  const point = path.ownerSVGElement.createSVGPoint();
  const pathPoint = path.getPointAtLength(distance);
  point.x = pathPoint.x;
  point.y = pathPoint.y;
  const screenPoint = point.matrixTransform(matrix);
  return { x: screenPoint.x - canvasRect.left, y: screenPoint.y - canvasRect.top };
}

function findNearestJourneyDistance(path, marker) {
  const markerRect = marker.getBoundingClientRect();
  const target = { x: markerRect.left + markerRect.width / 2, y: markerRect.top + markerRect.height / 2 };
  const canvasRect = journeyCanvas.getBoundingClientRect();
  const matrix = path.getScreenCTM();
  const total = path.getTotalLength();
  const samples = 420;
  let closest = 0;
  let shortest = Infinity;

  for (let index = 0; index <= samples; index += 1) {
    const distance = total * index / samples;
    const point = pathPointInCanvas(path, distance, canvasRect, matrix);
    const dx = point.x + canvasRect.left - target.x;
    const dy = point.y + canvasRect.top - target.y;
    const separation = dx * dx + dy * dy;
    if (separation < shortest) {
      shortest = separation;
      closest = distance;
    }
  }
  return closest;
}

function placeJourneyAvatar(path, distance, walking = false) {
  const canvasRect = journeyCanvas.getBoundingClientRect();
  const total = path.getTotalLength();
  const atEnd = distance >= total - 4;
  const beforeDistance = Math.max(0, distance - 3);
  const afterDistance = Math.min(total, distance + 3);
  const point = pathPointInCanvas(path, distance, canvasRect);
  const before = pathPointInCanvas(path, beforeDistance, canvasRect);
  const after = pathPointInCanvas(path, afterDistance, canvasRect);
  const start = atEnd ? before : point;
  const finish = atEnd ? point : after;
  const angle = Math.atan2(finish.y - start.y, finish.x - start.x) * 180 / Math.PI;

  journeyPosition = distance;
  journeyAvatar.style.left = `${point.x}px`;
  journeyAvatar.style.top = `${point.y}px`;
  avatarSvg.style.setProperty('--avatar-angle', `${angle}deg`);
  journeyAvatar.classList.toggle('walking', walking);
  journeyAvatar.style.visibility = 'visible';
}

function highlightJourneyStop(index) {
  journeyCards.forEach((card, cardIndex) => {
    card.classList.toggle('is-reached', cardIndex <= index);
    card.classList.toggle('is-active', cardIndex === index);
    journeyStops[cardIndex].querySelector('.road-marker').classList.toggle('is-active', cardIndex === index);
  });
  const names = ['Class 10th, 2021', 'Class 12th, 2023', 'B.Tech, expected graduation 2027'];
  journeyStatus.textContent = `Student reached ${names[index]}.`;
}

function travelJourneySegment(from, to, duration, runId, onArrival) {
  const startedAt = performance.now();
  const distance = to - from;

  function tick(now) {
    if (runId !== journeyRunId) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = progress < .5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
    placeJourneyAvatar(journeyPath, from + distance * eased, progress < 1);
    if (progress < 1) journeyFrame = requestAnimationFrame(tick);
    else onArrival();
  }

  journeyFrame = requestAnimationFrame(tick);
}

function stopJourneyAnimation() {
  journeyRunId += 1;
  cancelAnimationFrame(journeyFrame);
  clearTimeout(journeyPause);
  journeyAvatar.classList.remove('walking', 'celebrate');
}

function playJourney() {
  stopJourneyAnimation();
  const runId = journeyRunId;
  journeyPath = getActiveJourneyPath();
  if (!journeyPath) return;

  journeyLengths = journeyStops.map((stop) => findNearestJourneyDistance(journeyPath, stop.querySelector('.road-marker')));
  journeyCards.forEach((card) => card.classList.remove('is-reached', 'is-active'));
  journeyStops.forEach((stop) => stop.querySelector('.road-marker').classList.remove('is-active'));
  journeyAvatar.style.visibility = 'visible';

  if (reducedMotion.matches) {
    journeyCards.forEach((card) => card.classList.add('is-reached'));
    journeyCards.at(-1).classList.add('is-active');
    journeyStops.at(-1).querySelector('.road-marker').classList.add('is-active');
    placeJourneyAvatar(journeyPath, journeyLengths.at(-1));
    journeyStatus.textContent = 'Student journey: Class 10th, Class 12th, and current B.Tech milestone.';
    return;
  }

  placeJourneyAvatar(journeyPath, 0);

  function arriveAt(index) {
    if (runId !== journeyRunId) return;
    placeJourneyAvatar(journeyPath, journeyLengths[index]);
    highlightJourneyStop(index);
    if (index === journeyStops.length - 1) {
      journeyAvatar.classList.add('celebrate');
      journeyPause = window.setTimeout(() => journeyAvatar.classList.remove('celebrate'), 1500);
      return;
    }

    journeyPause = window.setTimeout(() => {
      const nextIndex = index + 1;
      const from = journeyLengths[index];
      const to = journeyLengths[nextIndex];
      const segmentDuration = 1450 + 2100 * Math.abs(to - from) / journeyPath.getTotalLength();
      travelJourneySegment(from, to, segmentDuration, runId, () => arriveAt(nextIndex));
    }, 950);
  }

  const firstStopDuration = Math.max(900, 1450 * journeyLengths[0] / journeyPath.getTotalLength());
  travelJourneySegment(0, journeyLengths[0], firstStopDuration, runId, () => arriveAt(0));
}

replayButton.addEventListener('click', playJourney);

const journeyResizeObserver = new ResizeObserver(() => {
  if (!journeyPath) return;
  const activePath = getActiveJourneyPath();
  if (activePath !== journeyPath) playJourney();
  else placeJourneyAvatar(journeyPath, journeyPosition, journeyAvatar.classList.contains('walking'));
});
journeyResizeObserver.observe(journeyCanvas);

function handleMotionPreferenceChange(event) {
  if (event.matches && journey.classList.contains('is-visible')) playJourney();
}
reducedMotion.addEventListener('change', handleMotionPreferenceChange);

function cleanupJourney() {
  stopJourneyAnimation();
  journeyRoadObserver.disconnect();
  milestoneObserver.disconnect();
  journeyResizeObserver.disconnect();
  observer.disconnect();
  replayButton.removeEventListener('click', playJourney);
  reducedMotion.removeEventListener('change', handleMotionPreferenceChange);
  window.removeEventListener('pagehide', cleanupJourney);
}
window.addEventListener('pagehide', cleanupJourney, { once: true });
