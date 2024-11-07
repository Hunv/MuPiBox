import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  Signal,
  WritableSignal,
  effect,
  signal,
} from '@angular/core'
import type { CategoryType, Media } from '../media'
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonToolbar,
} from '@ionic/angular/standalone'
import { NavigationExtras, Router } from '@angular/router'
import {
  bookOutline,
  cloudOfflineOutline,
  cloudOutline,
  musicalNotesOutline,
  radioOutline,
  timerOutline,
} from 'ionicons/icons'
import { catchError, combineLatest, distinctUntilChanged, filter, lastValueFrom, map, of, switchMap, tap } from 'rxjs'
import { toObservable, toSignal } from '@angular/core/rxjs-interop'

import type { Artist } from '../artist'
import { ArtworkService } from '../artwork.service'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LoadingComponent } from '../loading/loading.component'
import { MediaService } from '../media.service'
import { MupiHatIconComponent } from '../mupihat-icon/mupihat-icon.component'
import { PlayerService } from '../player.service'
import { addIcons } from 'ionicons'

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    MupiHatIconComponent,
    LoadingComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class HomePage {
  protected covers = {}
  protected editButtonclickCount = 0
  protected editClickTimer = 0

  protected artists: Signal<Artist[]>
  protected isOnline: Signal<boolean>
  protected isLoading: WritableSignal<boolean> = signal(false)
  protected category: WritableSignal<CategoryType> = signal('audiobook')

  protected pageIsShown: WritableSignal<boolean> = signal(true)

  constructor(
    private mediaService: MediaService,
    private artworkService: ArtworkService,
    private playerService: PlayerService,
    private router: Router,
  ) {
    addIcons({ timerOutline, bookOutline, musicalNotesOutline, radioOutline, cloudOutline, cloudOfflineOutline })

    this.isOnline = toSignal(
      this.mediaService.network$.pipe(
        filter((network) => network.ip !== undefined),
        map((network) => network.onlinestate === 'online'),
        distinctUntilChanged(),
      ),
    )
    this.artists = toSignal(
      combineLatest([toObservable(this.category), toObservable(this.isOnline)]).pipe(
        map(([category, _isOnline]) => category),
        tap(() => this.isLoading.set(true)),
        switchMap((category) => {
          return this.mediaService.fetchArtistData(category).pipe(
            catchError((error) => {
              console.error(error)
              return of([])
            }),
          )
        }),
        map((artists) => {
          for (const artist of artists) {
            this.artworkService.getArtistArtwork(artist.coverMedia).subscribe((url) => {
              this.covers[artist.name] = url
            })
          }
          return artists
        }),
        tap(() => this.isLoading.set(false)),
      ),
    )

    effect(() => {
      this.mediaService.setCategory(this.category())
    })
  }

  public ionViewWillEnter(): void {
    this.pageIsShown.set(true)
  }

  public ionViewWillLeave(): void {
    this.pageIsShown.set(false)
  }

  public categoryChanged(event: any): void {
    this.category.set(event.detail.value)
  }

  artistCoverClicked(clickedArtist: Artist) {
    const navigationExtras: NavigationExtras = {
      state: {
        artist: clickedArtist,
        category: this.category(),
      },
    }
    this.router.navigate(['/medialist'], navigationExtras)
  }

  editButtonPressed() {
    window.clearTimeout(this.editClickTimer)

    if (this.editButtonclickCount < 9) {
      this.editButtonclickCount++

      this.editClickTimer = window.setTimeout(() => {
        this.editButtonclickCount = 0
      }, 500)
    } else {
      this.editButtonclickCount = 0
      this.router.navigate(['/edit'])
    }
  }

  protected resume(): void {
    this.router.navigate(['/resume'])
  }

  protected readText(text: string): void {
    this.playerService.sayText(text)
  }
}
