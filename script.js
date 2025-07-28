// Configurações
const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

const config = {
  delayRequisicoes: 100,
  zoomPadrao: 12,
  maxThumbnails: 3
};

// Variáveis globais
let cities = [];
let map;
let markers = [];
let currentCity = null;
let loadedImages = {};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadData();
  setupEventListeners();
});

// Carrega dados da planilha
async function loadData() {
  try {
    showResult("🔄 Carregando dados das cidades...", "info");
    const response = await fetch(url);
    const rep = await response.text();
    const jsonData = JSON.parse(rep.substr(47).slice(0, -2));
    
    cities = jsonData.table.rows.map(row => ({
      nome: row.c[0]?.v || '',
      desenhada: row.c[1]?.v || 'Não',
      link: row.c[2]?.v || ''
    }));
    
    setupAutocomplete();
    preloadImages();
    addMarkersToMap();
    updateProgress(); // Atualiza barra de progresso inicial
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    showResult("⚠️ Falha ao carregar dados. Recarregue a página.", "error");
  }
}

// Pré-carrega imagens para melhor performance
function preloadImages() {
  cities.filter(c => c.desenhada === "Sim" && c.link).forEach(city => {
    const img = new Image();
    img.src = city.link;
    loadedImages[city.nome] = img;
  });
}

// Configura o mapa Leaflet
function initMap() {
  map = L.map('map').setView([-30.5, -53.2], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

// Adiciona marcadores no mapa
async function addMarkersToMap() {
  clearMarkers();
  const drawnCities = cities.filter(c => c.desenhada === "Sim");
  
  showResult(`🔄 Carregando ${drawnCities.length} cidades no mapa...`, "info");
  
  for (const city of drawnCities) {
    try {
      const coords = await fetchCoordinates(city.nome);
      if (coords) {
        const marker = L.marker([coords.lat, coords.lon], {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
            iconSize: [24, 24]
          })
        }).addTo(map);
        
        marker.bindPopup(createPopupContent(city));
        marker.on('click', () => showCityImage(city.nome));
        markers.push(marker);
      }
      await new Promise(resolve => setTimeout(resolve, config.delayRequisicoes));
    } catch (error) {
      console.error(`Erro ao processar ${city.nome}:`, error);
    }
  }
  
  showResult(`✅ ${markers.length} cidades carregadas no mapa`, "success");
  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [50, 50] });
  }
}

// Cria conteúdo para os popups do mapa
function createPopupContent(city) {
  return `
    <b>${city.nome}</b>
    ${city.link ? `
      <div style="margin-top:8px">
        <img src="${city.link}" 
             style="width:100px;height:100px;object-fit:cover;cursor:pointer" 
             onclick="showCityImage('${city.nome}')">
      </div>
    ` : ''}
  `;
}

// Mostra imagem principal
function showCityImage(cityName) {
  currentCity = cities.find(c => c.nome === cityName);
  if (!currentCity?.link) return;

  const cityImage = document.getElementById("cityImage");
  const imageLoader = document.getElementById("imageLoader");
  
  // Atualiza interface
  document.getElementById("cityInput").value = currentCity.nome;
  document.getElementById("currentCityTitle").textContent = currentCity.nome;
  
  imageLoader.style.display = 'block';
  cityImage.style.opacity = '0';
  document.getElementById("imageContainer").style.display = 'block';
  
  cityImage.onload = function() {
    imageLoaded();
    centerOnCity(cityName);
    updateProgress();
  };
  
  cityImage.src = currentCity.link;
  cityImage.alt = `Desenho de ${cityName}`;
  
  updateThumbnails();
}

// Atualiza thumbnails
function updateThumbnails() {
  const thumbnailsContainer = document.getElementById("thumbnails");
  thumbnailsContainer.innerHTML = '<h4>Explore outras cidades desenhadas:</h4>';
  
  // Seleciona cidades aleatórias, exceto a atual
  const otherCities = cities
    .filter(c => c.desenhada === "Sim" && c.nome !== currentCity?.nome && c.link)
    .sort(() => Math.random() - 0.5)
    .slice(0, config.maxThumbnails);
  
  otherCities.forEach(city => {
    const thumb = document.createElement('div');
    thumb.className = 'thumbnail-item';
    thumb.innerHTML = `
      <img src="${city.link}" alt="${city.nome}" 
           onclick="showCityImage('${city.nome}')">
      <p>${city.nome}</p>
    `;
    thumbnailsContainer.appendChild(thumb);
  });
}

// Atualiza barra de progresso
function updateProgress() {
  const drawnCount = cities.filter(c => c.desenhada === "Sim").length;
  const total = cities.length;
  const percent = Math.round((drawnCount / total) * 100);
  
  document.getElementById("progressBar").style.width = `${percent}%`;
  document.getElementById("progressText").textContent = 
    `${drawnCount}/${total} cidades (${percent}%)`;
}

// Busca coordenadas via API
async function fetchCoordinates(cityName) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ', RS, Brasil')}&format=json`
    );
    const data = await response.json();
    return data[0] ? { 
      lat: parseFloat(data[0].lat), 
      lon: parseFloat(data[0].lon) 
    } : null;
  } catch (error) {
    console.error(`Erro ao buscar coordenadas para ${cityName}:`, error);
    return null;
  }
}

// Configura autocomplete
function setupAutocomplete() {
  const input = document.getElementById("cityInput");
  const datalist = document.getElementById("cityList");

  input.addEventListener('input', () => {
    const searchTerm = input.value.trim().toLowerCase();
    datalist.innerHTML = '';

    if (searchTerm.length < 2) return;

    cities
      .filter(city => city.nome.toLowerCase().startsWith(searchTerm))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 20)
      .forEach(city => {
        const option = document.createElement("option");
        option.value = city.nome;
        datalist.appendChild(option);
      });
  });
}

// Função de busca principal
function checkCity() {
  const input = document.getElementById("cityInput");
  const cityName = input.value.trim();

  if (!cityName) {
    showResult("Por favor, digite o nome de uma cidade.", "error");
    hideImageContainer();
    return;
  }

  const foundCity = cities.find(c => 
    c.nome.toLowerCase() === cityName.toLowerCase()
  );

  if (!foundCity) {
    showResult("❌ Cidade não encontrada. Verifique o nome.", "error");
    hideImageContainer();
    return;
  }

  if (foundCity.desenhada === "Sim") {
    showResult(`✅ <strong>${foundCity.nome}</strong> já foi desenhada!`, "success");
    showCityImage(foundCity.nome);
  } else {
    showResult(`✏️ <strong>${foundCity.nome}</strong> ainda não foi desenhada.`, "warning");
    hideImageContainer();
  }
}

// Centraliza no mapa
async function centerOnCity(cityName) {
  const coords = await fetchCoordinates(cityName);
  if (coords) {
    map.setView([coords.lat, coords.lon], config.zoomPadrao);
  }
}

// Limpa marcadores
function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

// Esconde container de imagem
function hideImageContainer() {
  document.getElementById("imageContainer").style.display = 'none';
}

// Quando imagem carrega
function imageLoaded() {
  const cityImage = document.getElementById("cityImage");
  const imageLoader = document.getElementById("imageLoader");
  
  cityImage.style.opacity = '1';
  imageLoader.style.display = 'none';
}

// Mostra mensagens
function showResult(message, type) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = message;
  resultDiv.className = type;
}

// Configura listeners
function setupEventListeners() {
  document.getElementById("cityInput").addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkCity();
  });
}
