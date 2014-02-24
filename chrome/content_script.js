var a = document.createElement('a');
var linkText = document.createTextNode("Add to Channel");
var allEpisodeIds = {};
var pageEpisodeIds = [];
var queuedEpisodes = [];
var title, season;
a.appendChild(linkText);
a.href = "#";

/**
 * Scrapes the page for all episode IDs and grabs the season and title of the show as well.
 */
function scrapePage() {
  var episodes = document.querySelectorAll("[data-episodeid]");
  for (var i = 0; i < episodes.length; i++) {
    var episode = episodes[i];
    var episodeId = episode.getAttribute('data-episodeid');
    pageEpisodeIds.push(episodeId);
  }
  title = document.querySelector("h1.title").innerHTML;
  season = document.querySelector("#selectorButton").querySelector(".selectorTxt").innerHTML;
}

/**
 * Event handler. 
 * Stores the IDs that were scraped from the page into long-term storage.
 */
function storeIds(event) {
  event.preventDefault();


  var showEpisodes = allEpisodeIds[title];
  if (showEpisodes == null) {
    showEpisodes = {};
  }
  var seasonEpisodes = showEpisodes[season];
  if (seasonEpisodes == null) {
    seasonEpisodes = {};
  }

  for (var i = 0; i < pageEpisodeIds.length; i++) {
    seasonEpisodes[pageEpisodeIds[i]] = true;
  }

  showEpisodes[season] = seasonEpisodes;
  allEpisodeIds[title] = showEpisodes;

  chrome.storage.sync.set({'episodes': allEpisodeIds}, function() {
    console.log(JSON.stringify(allEpisodeIds));
    a.innerHTML = "Episodes saved!";
  });
  return false;
}

/**
 * Event handler.
 * Removes all episode IDs for this season from this title from long-term storage.
 */
function removeIds(event) {
  event.preventDefault();

  var showEpisodes = allEpisodeIds[title];
  if (showEpisodes == null) {
    showEpisodes = {};
  }
  delete showEpisodes[season];
  allEpisodeIds[title] = showEpisodes;

  chrome.storage.sync.set({'episodes': allEpisodeIds}, function() {
    console.log(JSON.stringify(allEpisodeIds));
    a.innerHTML = "Episodes removed!";
  });

  return false;
}

/**
 * Adds epiosdes to the queue, then randomizes them
 */
function addEpisodes() {
  var titles = Object.keys(allEpisodeIds);
  var episodes = [];

  // Add all episodes
  for (var i = 0; i < titles.length; i++) {
    var title = titles[i];
    var showEpisodes = allEpisodeIds[title];
    var seasons = Object.keys(showEpisodes);
    for (var j = 0; j < seasons.length; j++) {
      var season = seasons[j];
      var seasonEpisodes = showEpisodes[season];
      var episodeIds = Object.keys(seasonEpisodes);
      episodes = episodes.concat(episodeIds);
    }
  }

  // Randomize episodes
  var copy = [], n = episodes.length, k;
  while (n) {

    k = Math.floor(Math.random() * episodes.length);

    if (k in episodes) {
      copy.push(episodes[k]);
      delete episodes[k];
      n--;
    }
  }

  return copy;
}

/**
 * Changes the link tag, depending on whether these episodes have been synced or not.
 */
function setLinkTag() {

  var synced = false;

  if (allEpisodeIds != null) {
    var showEpisodes = allEpisodeIds[title];
    if (showEpisodes != null) {
      var seasonEpisodes = showEpisodes[season];
      if (seasonEpisodes != null) {
        synced = true;
        for (var i = 0; i < pageEpisodeIds.length; i++) {
          if (!seasonEpisodes[pageEpisodeIds[i]]) {
            synced = false;
            break;
          }
        }
      }
    }
  }

  a.removeEventListener('click', removeIds);
  a.removeEventListener('click', storeIds);

  if (synced) {
    a.innerHTML = "Remove from channel";
    a.addEventListener('click', removeIds);
  } else {
    a.innerHTML = "Add to Channel";
    a.addEventListener('click', storeIds);
  }

}

/**
 * Grabs episodes from long-term storage and sets the timeout for scraping the page.
 */
chrome.storage.sync.get('episodes', function(data) {

  allEpisodeIds = data.episodes;
  document.getElementById('seasonSelector').appendChild(a);

  var timeoutFn = function() {
    scrapePage();
    setLinkTag();
    setTimeout(timeoutFn, 3000);
  }

  timeoutFn();
});

/**
 * Binds the key listener for playing the next episode
 */
window.addEventListener('keydown', keydownHandler, false);
function keydownHandler(event) {
    if ( event.keyCode == 89 && event.shiftKey ) {
      playNextEpisode();
      return false;
    }
}

/**
 * Plays the next queued episode. If there are no queued episodes,
 * calls |addEpisodes|. If that fails to add any episodes, does nothing.
 */
function playNextEpisode() {
  if (queuedEpisodes.length === 0) {
    console.log('Adding new episodes');
    queuedEpisodes = addEpisodes();
  }
  if (queuedEpisodes.length === 0) {
    console.log('couldnt find any new episodes to add!');
    return;
  }
  var nextEpisode = queuedEpisodes.shift();
  console.log('Shifting to episode: ' + nextEpisode);
  var url = "http://www.netflix.com/WiPlayer?movieid=" + nextEpisode;
  window.location = url;
}
