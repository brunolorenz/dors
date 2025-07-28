const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

const config = {
  delayRequisicoes: 1000,
  zoomPadrao: 12,
  maxThumbnails: 6
};

let cities = [];
let map;
let markers = [];
let loadedImages = {};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadData();
});

// Carrega dados
async function loadData() {
  try {
    showResult("🔄 Carregando dados...", "info");
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
  } catch (err) {
    console.error("Erro:", err);
    showResult("⚠️ Erro ao carregar dados. Recarregue a página.", "error");
  }
}

// Pré-carrega imagens
function preloadImages() {
  cities.filter(c => c.desenhada === "Sim" && c.link).forEach(city => {
    const img = new Image();
    img.src = city.link;
    loadedImages[city.nome] = img;
  });
}

// Configura o mapa
function initMap() {
  map = L.map('map').setView([-30.5, -53.2], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

// Adiciona marcadores
async function addMarkersToMap() {
  clearMarkers();
  const drawnCities = cities.filter(c => c.desenhada === "Sim");
  
  showResult(`🔄 Carregando ${drawnCities.length} cidades...`, "info");
  
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
        markers.push(marker);
      }
      await new Promise(resolve => setTimeout(resolve, config.delayRequisicoes));
    } catch (error) {
      console.error(`Erro em ${city.nome}:`, error);
    }
  }
  
  showResult(`✅ ${markers.length} cidades carregadas`, "success");
  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [50, 50] });
  }
}

// Cria conteúdo do popup
function createPopupContent(city) {
  return `
    <b>${city.nome}</b>
    ${city.link ? `
      <div style="margin-top:10px">
        <img src="${city.link}" class="thumbnail" onclick="showCityImage('${city.nome}')">
      </div>
    ` : ''}
  `;
}

// Mostra imagem principal
function showCityImage(cityName) {
  const city = cities.find(c => c.nome === cityName);
  if (!city?.link) return;
  
  const imageContainer = document.getElementById("imageContainer");
  const cityImage = document.getElementById("cityImage");
  const imageLoader = document.getElementById("imageLoader");
  const thumbnails = document.getElementById("thumbnails");
  
  imageLoader.style.display = 'block';
  cityImage.style.opacity = '0';
  imageContainer.style.display = 'block';
  
  cityImage.onload = function() {
    imageLoaded();
    centerOnCity(cityName);
  };
  
  cityImage.src = city.link;
  cityImage.alt = `Desenho de ${cityName}`;
  
  // Atualiza miniaturas
  updateThumbnails(cityName);
}

// Atualiza miniaturas
function updateThumbnails(currentCity) {
  const thumbnails = document.getElementById("thumbnails");
  thumbnails.innerHTML = '';
  
  const drawnCities = cities
    .filter(c => c.desenhada === "Sim" && c.link && c.nome !== currentCity)
    .slice(0, config.maxThumbnails);
  
  drawnCities.forEach(city => {
    const thumb = document.createElement('img');
    thumb.src = city.link;
    thumb.alt = city.nome;
    thumb.className = 'thumbnail';
    thumb.onclick = () => showCityImage(city.nome);
    thumbnails.appendChild(thumb);
  });
}

// Quando imagem carrega
function imageLoaded() {
  const cityImage = document.getElementById("cityImage");
  const imageLoader = document.getElementById("imageLoader");
  
  cityImage.style.opacity = '1';
  imageLoader.style.display = 'none';
}

// Busca coordenadas
async function fetchCoordinates(cityName) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ', RS, Brasil')}&format=json`
    );
    const data = await response.json();
    return data[0] ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  } catch (error) {
    console.error(`Erro ao buscar ${cityName}:`, error);
    return null;
  }
}

// Autocomplete
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

// Função de busca
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

// Esconde a área de imagem
function hideImageContainer() {
  document.getElementById("imageContainer").style.display = 'none';
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

// Exibe mensagens
function showResult(message, type) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = message;
  resultDiv.className = type;
}
