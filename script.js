const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

// Configurações
const config = {
  delayRequisicoes: 1000, // Delay entre requisições à API (1 segundo)
  zoomPadrao: 12 // Zoom quando seleciona uma cidade
};

let cities = [];
let map;
let markers = []; // Armazena todos os marcadores

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadData();
});

// Carrega dados da planilha
async function loadData() {
  try {
    const response = await fetch(url);
    const rep = await response.text();
    const jsonData = JSON.parse(rep.substr(47).slice(0, -2));
    
    cities = jsonData.table.rows.map(row => ({
      nome: row.c[0]?.v || '',
      desenhada: row.c[1]?.v || 'Não',
      link: row.c[2]?.v || '#'
    }));
    
    setupAutocomplete();
    addMarkersToMap(); // Mostra automaticamente as cidades desenhadas
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    showResult("⚠️ Erro ao carregar dados. Recarregue a página.", "error");
  }
}

// Configura o mapa
function initMap() {
  map = L.map('map').setView([-30.5, -53.2], 6); // Vista geral do RS
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

// Adiciona marcadores automaticamente
async function addMarkersToMap() {
  clearMarkers(); // Limpa marcadores antigos
  
  const drawnCities = cities.filter(city => city.desenhada === "Sim");
  showResult(`🔄 Carregando ${drawnCities.length} cidades...`, 'info');
  
  for (const city of drawnCities) {
    try {
      const coords = await fetchCoordinates(city.nome);
      if (coords) {
        const marker = L.marker([coords.lat, coords.lon], {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
            iconSize: [32, 32]
          })
        }).addTo(map);
        
        marker.bindPopup(`
          <b>${city.nome}</b><br>
          ${city.link ? `<a href="${city.link}" target="_blank">Ver desenho</a>` : ''}
        `);
        
        markers.push(marker);
      }
      await new Promise(resolve => setTimeout(resolve, config.delayRequisicoes));
    } catch (error) {
      console.error(`Erro ao processar ${city.nome}:`, error);
    }
  }
  
  showResult(`✅ ${markers.length} cidades desenhadas carregadas`, 'success');
  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [50, 50] });
  }
}

// Busca coordenadas via Nominatim
async function fetchCoordinates(cityName) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ', RS, Brasil')}&format=json`
    );
    const data = await response.json();
    return data[0] ? { lat: data[0].lat, lon: data[0].lon } : null;
  } catch (error) {
    console.error(`Erro ao buscar ${cityName}:`, error);
    return null;
  }
}

// Limpa marcadores
function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

// Autocomplete
function setupAutocomplete() {
  const input = document.getElementById("cityInput");
  const datalist = document.getElementById("cityList");

  input.addEventListener('input', () => {
    const searchTerm = input.value.trim().toLowerCase();
    datalist.innerHTML = '';

    if (searchTerm.length === 0) return;

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
    return;
  }

  const foundCity = cities.find(c => 
    c.nome.toLowerCase() === cityName.toLowerCase()
  );

  if (!foundCity) {
    showResult("❌ Cidade não encontrada. Verifique o nome.", "error");
    return;
  }

  if (foundCity.desenhada === "Sim") {
    showResult(
      `✅ <strong>${foundCity.nome}</strong> já foi desenhada!`,
      "success"
    );
    centerOnCity(foundCity.nome);
  } else {
    showResult(`✏️ <strong>${foundCity.nome}</strong> ainda não foi desenhada.`, "warning");
  }
}

// Centraliza no mapa
async function centerOnCity(cityName) {
  const coords = await fetchCoordinates(cityName);
  if (coords) {
    map.setView([coords.lat, coords.lon], config.zoomPadrao);
  }
}

// Exibe mensagens
function showResult(message, type) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = message;
  resultDiv.className = type;
}
