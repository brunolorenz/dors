const sheetID = "177led-vdMhTNiNfxUT97OzAKbJh8hgXiOrKslwM0oFA";
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = "Página1";
const query = encodeURIComponent("Select A,B,C");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

// Cache de coordenadas para cidades do RS
const coordenadasRS = {
  "Porto Alegre": { lat: -30.0331, lng: -51.23 },
  "Caxias do Sul": { lat: -29.168, lng: -51.1798 },
  "Pelotas": { lat: -31.7619, lng: -52.3378 },
  // Adicione mais cidades aqui...
};

// Configuração
const config = {
  usarAPICoordenadas: false, // Altere para true se quiser buscar coordenadas dinamicamente
  delayRequisicoesAPI: 1000 // Delay entre requisições à API (em ms)
};

let cities = [];
let map;

// Carrega os dados da planilha
document.addEventListener('DOMContentLoaded', () => {
  fetch(url)
    .then(res => res.text())
    .then(rep => {
      const jsonData = JSON.parse(rep.substr(47).slice(0, -2));
      cities = jsonData.table.rows.map(row => ({
        nome: row.c[0]?.v || '',
        desenhada: row.c[1]?.v || 'Não',
        link: row.c[2]?.v || '#'
      }));
      
      setupAutocomplete();
      initMap();
      addMarkersToMap();
    })
    .catch(err => {
      console.error("Erro ao carregar dados:", err);
      showResult("⚠️ Erro ao carregar dados. Recarregue a página.", "error");
    });
});

// Configura o autocomplete
function setupAutocomplete() {
  const input = document.getElementById("cityInput");
  const datalist = document.getElementById("cityList");

  input.addEventListener('input', () => {
    const searchTerm = input.value.trim().toLowerCase();
    datalist.innerHTML = '';

    if (searchTerm.length === 0) return;

    const filteredCities = cities.filter(city => 
      city.nome.toLowerCase().startsWith(searchTerm)
    );

    filteredCities
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 20)
      .forEach(city => {
        const option = document.createElement("option");
        option.value = city.nome;
        datalist.appendChild(option);
      });
  });
}

// Inicializa o mapa
function initMap() {
  map = L.map('map').setView([-30.5, -53.2], 6.4);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

// Adiciona marcadores (versão aprimorada)
async function addMarkersToMap() {
  const drawnCities = cities.filter(city => city.desenhada === "Sim");
  const missingCoords = [];

  for (const city of drawnCities) {
    if (!coordenadasRS[city.nome]) {
      missingCoords.push(city.nome);
      
      if (config.usarAPICoordenadas) {
        try {
          const coords = await fetchCoordinates(city.nome);
          if (coords) {
            coordenadasRS[city.nome] = coords;
            addMarkerToMap(city);
          }
        } catch (error) {
          console.error(`Falha ao buscar ${city.nome}:`, error);
        }
      }
    } else {
      addMarkerToMap(city);
    }
  }

  // Log de cidades sem coordenadas
  if (missingCoords.length > 0) {
    console.group("Cidades desenhadas sem coordenadas:");
    console.table(missingCoords);
    console.groupEnd();
    
    if (!config.usarAPICoordenadas) {
      console.info("Dica: Ative config.usarAPICoordenadas para busca automática");
    }
  }
}

// Função auxiliar para adicionar marcador
function addMarkerToMap(city) {
  const coords = coordenadasRS[city.nome];
  if (!coords) return;

  const marker = L.marker([coords.lat, coords.lng], {
    icon: L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
      iconSize: [32, 32]
    })
  }).addTo(map);

  marker.bindPopup(`
    <b>${city.nome}</b><br>
    <a href="${city.link}" target="_blank">Ver desenho</a>
  `);
}

// Busca coordenadas via API (opcional)
async function fetchCoordinates(cityName) {
  if (!config.usarAPICoordenadas) return null;
  
  try {
    await new Promise(resolve => setTimeout(resolve, config.delayRequisicoesAPI));
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ', RS, Brasil')}&format=json`
    );
    
    const data = await response.json();
    return data[0] ? { lat: data[0].lat, lng: data[0].lon } : null;
  } catch (error) {
    console.error(`Erro na API para ${cityName}:`, error);
    return null;
  }
}

// Função de busca com feedback
function checkCity() {
  const input = document.getElementById("cityInput");
  const cityName = input.value.trim();
  const resultDiv = document.getElementById("result");

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
      `✅ <strong>${foundCity.nome}</strong> já foi desenhada!<br>
      <a href="${foundCity.link}" target="_blank">Ver desenho</a>`,
      "success"
    );
    centerMapOnCity(foundCity.nome);
  } else {
    showResult(`✏️ <strong>${foundCity.nome}</strong> ainda não foi desenhada.`, "warning");
  }
}

// Funções auxiliares
function showResult(message, type) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = message;
  resultDiv.className = type;
}

function centerMapOnCity(cityName) {
  const coords = coordenadasRS[cityName];
  if (coords) {
    map.setView([coords.lat, coords.lng], 12);
  }
}
