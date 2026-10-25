import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';

/**
 * Panel de estado a pantalla completa (error, vacío, no encontrado).
 * Compartido por home y detalle para que los tres estados se vean igual.
 */
@Component({
  selector: 'app-panel-estado',
  templateUrl: './panel-estado.component.html',
  styleUrls: ['./panel-estado.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon],
})
export class PanelEstadoComponent {
  /** Icono de ionicons; debe estar registrado en `main.ts` para verse sin red. */
  readonly icono = input('cloud-offline-outline');
  readonly titulo = input.required<string>();
  readonly mensaje = input('');
  /** Etiqueta de la acción; si viene vacía no se muestra botón. */
  readonly accion = input('');
  readonly rol = input<'alert' | 'status'>('status');

  readonly accionClick = output<void>();
}
