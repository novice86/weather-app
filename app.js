const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';

// Application State
let currentState = {
    lat: 35.7326, 
    lon: -78.8503,
    name: 'Apex, North Carolina, United States',
    view: 'temperature' 
};

// The Debounce Timer variable
let debounceTimer;

// DOM Elements
const errorBox = document.getElementById('errorBox');
const locationName = document.getElementById('locationName');
const loader = document.getElementById('loader');
const dataContainer = document.getElementById('dataContainer');
const tabBtns = document.querySelectorAll('.tab-btn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const suggestionsBox = document.getElementById('suggestionsBox');

// Map WMO Weather codes to readable conditions
function getWeatherDescription(code) {
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Heavy rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Unknown Conditions';
}

async function searchLocation(query) {
    try {
        // Break the user's search into pieces
        // Example: "Paris, Texas" becomes ["Paris", "Texas"]
        const searchParts = query.split(',').map(part => part.trim());
        const searchCity = searchParts[0];

        // Grab the second part (State or Country) and make it lowercase for easy comparing
        const searchStateOrCountry = searchParts.length > 1 ? searchParts[1].toLowerCase() : null;

        // Fetch up to 10 cities matching the base name
        const response = await fetch(`${GEO_API}?name=${encodeURIComponent(searchCity)}&count=10&language=en&format=json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            showError("City not found. Please try another search.");
            return;
        }

        // Find the best match!
        let bestMatch = data.results[0]; // Default to the first (most popular) result

        // If the user typed a state or country, look for a match in the 10 results
        if (searchStateOrCountry) {
            const foundMatch = data.results.find(city => {
                const stateName = (city.admin1 || "").toLowerCase();
                const countryName = (city.country || "").toLowerCase();
                
                // Does the API's state or country match what the user typed?
                return stateName === searchStateOrCountry || countryName === searchStateOrCountry;
            });

            // If we found the specific one they wanted, overwrite the default!
            if (foundMatch) {
                bestMatch = foundMatch;
            }
        }

        // 4. Build the display name safely (avoiding Tokyo, Tokyo, Japan)
        const showState = bestMatch.admin1 && bestMatch.admin1 !== bestMatch.name;
        const stateString = showState ? `, ${bestMatch.admin1}` : '';
        const countryString = bestMatch.country ? `, ${bestMatch.country}` : '';

        // 5. Update application memory and UI
        currentState.lat = bestMatch.latitude;
        currentState.lon = bestMatch.longitude;
        currentState.name = `${bestMatch.name}${stateString}${countryString}`;
        
        if (typeof suggestionsBox !== 'undefined') {
            suggestionsBox.classList.add('hidden');
        }

        loadDataForCurrentView();

    } catch (error) {
        showError("Failed to search location. Please check your connection.");
        console.error("Search Error Details:", error);
    }
}

// Fetch suggestions as the user types
async function fetchSuggestions(query) {
    if (!query) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    try {
        // We use count=5 to get up to 5 suggestions
        const response = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        // Clear old suggestions
        suggestionsBox.innerHTML = '';
        currentFocus = -1;
        
        // Build the dropdown list
        data.results.forEach(city => {
            const cityName = `${city.name}${city.admin1 ? `, ${city.admin1}` : ''}, ${city.country}`;
            
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = cityName;
            
            // When a suggestion is clicked!
            div.addEventListener('click', () => {
                // Fill the input
                searchInput.value = cityName;
                // Hide the dropdown
                suggestionsBox.classList.add('hidden');
                
                // Directly update the state and fetch weather (skipping the search searchLocation function!)
                currentState.lat = city.latitude;
                currentState.lon = city.longitude;
                currentState.name = cityName;
                loadDataForCurrentView();
            });

            suggestionsBox.appendChild(div);
        });

        suggestionsBox.classList.remove('hidden');

    } catch (error) {
        console.error("Failed to fetch suggestions", error);
    }
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    setTimeout(() => errorBox.classList.add('hidden'), 5000);
}

async function fetchTemperature() {
    const url = `${FORECAST_API}?latitude=${currentState.lat}&longitude=${currentState.lon}&current=temperature_2m,apparent_temperature&temperature_unit=fahrenheit`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch temperature data');
    const data = await response.json();

    dataContainer.innerHTML = `
        <div class="data-label">Current Temperature</div>
        <div class="data-value">${data.current.temperature_2m}°F</div>
        <div class="data-label">Feels like: ${data.current.apparent_temperature}°F</div>
    `;
}

async function fetchConditions() {
    const url = `${FORECAST_API}?latitude=${currentState.lat}&longitude=${currentState.lon}&current=weather_code,wind_speed_10m&wind_speed_unit=mph`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch conditions data');
    const data = await response.json();

    const conditionText = getWeatherDescription(data.current.weather_code);

    dataContainer.innerHTML = `
        <div class="data-label">Current Conditions</div>
        <div class="data-value">${conditionText}</div>
        <div class="data-label">Wind Speed: ${data.current.wind_speed_10m} mph</div>
    `;
}

async function loadDataForCurrentView() {
    locationName.textContent = currentState.name;
    dataContainer.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        if (currentState.view === 'temperature') await fetchTemperature();
        else if (currentState.view === 'conditions') await fetchConditions();
    } catch (error) {
        showError("Failed to load weather data.");
        console.error(error);
    } finally {
        loader.classList.add('hidden');
    }
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active class styling
        tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Update state and fetch NEW data
        currentState.view = e.target.getAttribute('data-view');
        loadDataForCurrentView();
    });
});

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) searchLocation(query);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) searchLocation(query);
    }
});

// Listen for typing to show suggestions (with Debouncing)
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear the previous timer
    clearTimeout(debounceTimer);
    
    // Set a new timer to wait 300ms after they stop typing before fetching
    debounceTimer = setTimeout(() => {
        fetchSuggestions(query);
    }, 300);
});

// Close suggestions if the user clicks anywhere else on the page
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        suggestionsBox.classList.add('hidden');
    }
});

// Initialize app on load
loadDataForCurrentView();