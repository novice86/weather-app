const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';

let currentState = {
    lat: 35.7326, 
    lon: -78.8503,
    name: 'Apex, North Carolina, United States',
    view: 'temperature' 
};

const errorBox = document.getElementById('errorBox');
const locationName = document.getElementById('locationName');
const loader = document.getElementById('loader');
const dataContainer = document.getElementById('dataContainer');
const tabBtns = document.querySelectorAll('.tab-btn');

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

// Initialize app on load
loadDataForCurrentView();