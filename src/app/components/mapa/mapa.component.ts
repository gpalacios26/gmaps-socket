import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Lugar } from 'src/app/interfaces/lugar';
import { WebsocketService } from 'src/app/services/websocket.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {

  @ViewChild('map', { static: false }) mapaElement: ElementRef;
  public map: google.maps.Map;

  public marcadores: google.maps.Marker[] = [];
  public infoWindows: google.maps.InfoWindow[] = [];

  public lugares: Lugar[] = [];

  constructor(
    private http: HttpClient,
    public wsService: WebsocketService
  ) { }

  ngOnInit(): void {
    this.http.get(environment.wsUrl + '/mapa2').subscribe((lugares: Lugar[]) => {
      this.lugares = lugares;
      this.cargarMapa();
    });

    this.escucharSockets();
  }

  escucharSockets() {
    // marcador-nuevo2
    this.wsService.listen('marcador-nuevo2').subscribe((marcador: Lugar) => {
      this.agregarMarcador(marcador);
    });

    // marcador-mover2
    this.wsService.listen('marcador-mover2').subscribe((marcador: Lugar) => {
      for (const i in this.marcadores) {
        if (this.marcadores[i].getTitle() === marcador.id) {
          const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);
          this.marcadores[i].setPosition(latLng);
          break;
        }
      }
    });

    // marcador-borrar2
    this.wsService.listen('marcador-borrar2').subscribe((id: string) => {
      for (const i in this.marcadores) {
        if (this.marcadores[i].getTitle() === id) {
          this.marcadores[i].setMap(null);
          break;
        }
      }
    });
  }

  cargarMapa() {
    const latLng = new google.maps.LatLng(37.784679, -122.395936);

    const mapaOpciones: google.maps.MapOptions = {
      center: latLng,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapaElement.nativeElement, mapaOpciones);

    this.map.addListener('click', (coors: any) => {
      const nuevoMarcador: Lugar = {
        nombre: 'Nuevo Lugar',
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        id: new Date().toISOString()
      };

      this.agregarMarcador(nuevoMarcador);

      // Emitir evento de socket, agregar marcador
      this.wsService.emit('marcador-nuevo2', nuevoMarcador);
    });

    for (const lugar of this.lugares) {
      this.agregarMarcador(lugar);
    }
  }

  agregarMarcador(marcador: Lugar) {
    const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);

    const marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng,
      draggable: true,
      title: marcador.id
    });

    this.marcadores.push(marker);

    const contenido = `<b>${marcador.nombre}</b>`;
    const infoWindow = new google.maps.InfoWindow({
      content: contenido
    });

    this.infoWindows.push(infoWindow);

    google.maps.event.addDomListener(marker, 'click', () => {
      this.infoWindows.forEach(infoW => infoW.close());
      infoWindow.open(this.map, marker);
    });

    google.maps.event.addDomListener(marker, 'dblclick', (coors: any) => {
      marker.setMap(null);
      // Disparar un evento de socket, para borrar el marcador
      this.wsService.emit('marcador-borrar2', marcador.id);
    });

    google.maps.event.addDomListener(marker, 'drag', (coors: any) => {
      const nuevoMarcador = {
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        nombre: marcador.nombre,
        id: marcador.id
      };

      // Disparar un evento de socket, para mover el marcador
      this.wsService.emit('marcador-mover2', nuevoMarcador);
    });
  }

}
