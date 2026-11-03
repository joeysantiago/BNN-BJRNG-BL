import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { I18nService } from '../../../core/i18n.service';
import { KhataAvatar } from '../ui/khata-avatar/khata-avatar';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataMissing } from '../ui/khata-missing/khata-missing';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataSkeleton } from '../ui/khata-skeleton/khata-skeleton';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataEmptyArt } from '../ui/khata-empty-art/khata-empty-art';
import { fromMinor, toMinor, todayIso } from '../../../core/khata-format';
import { PHOTO_LIMITS, PHOTO_TYPES, compressPhoto, fileSize, photoName } from '../../../core/khata-photos';
import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { KHATA_CUSTOMER, KHATA_GAVE, KHATA_GOT, KhataBook, KhataContact, KhataEntry, KhataEntryRequest, KhataEntryType, KhataPhoto } from '../../../core/models/khata.model';

const MAX_NOTE = 500;

/**
 * /khata/app/b/:bookId/new (?contact=, ?type=) and /khata/app/b/:bookId/e/:entryId/edit: add or change an entry with up to three bill photos.
 * Photos are made smaller in the browser before upload. Saving stores the entry first, then removes and uploads photos.
 */
@Component({
  selector: 'app-khata-entry-form',
  templateUrl: './khata-entry-form.html',
  styleUrl: './khata-entry-form.scss',
  host: { '(window:beforeunload)': 'leaving($event)' },
  imports: [RouterLink, KhataIcon, KhataAvatar, KhataEmptyArt, KhataSkeleton, KhataMissing],
})

export class KhataEntryForm implements OnDestroy {
  protected readonly got = KHATA_GOT;
  protected readonly gave = KHATA_GAVE;
  protected readonly note = signal('');
  protected readonly error = signal('');
  protected readonly maxNote = MAX_NOTE;
  protected readonly today = todayIso();
  protected readonly amount = signal('');
  protected readonly fileSize = fileSize;
  private readonly removed: number[] = [];
  private replaceAt: number | null = null;
  protected readonly missing = signal('');
  private readonly router = inject(Router);
  private requestKey = crypto.randomUUID();
  protected readonly contactId = signal(0);
  protected readonly ready = signal(false);
  protected readonly loadError = signal('');
  protected readonly cantEdit = signal(false);
  protected readonly dragging = signal(false);
  private readonly ui = inject(KhataUiService);
  protected readonly date = signal(todayIso());
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly types = PHOTO_TYPES.join(',');
  private readonly state = inject(KhataStateService);
  protected readonly photos = signal<KhataPhoto[]>([]);
  protected readonly maxPhotos = PHOTO_LIMITS.maxPhotos;
  protected readonly book = signal<KhataBook | null>(null);
  protected readonly contacts = signal<KhataContact[]>([]);
  protected readonly entry = signal<KhataEntry | null>(null);
  protected readonly type = signal<KhataEntryType>(KHATA_GAVE);
  protected readonly busy = signal<'photos' | 'save' | null>(null);
  protected readonly invalid = signal<Record<string, boolean>>({});
  protected readonly maxPickedMb = PHOTO_LIMITS.maxPickedBytes / 1048576;
  private readonly camera = viewChild<ElementRef<HTMLInputElement>>('camera');
  private readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  private readonly replacer = viewChild<ElementRef<HTMLInputElement>>('replacer');
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  protected readonly decimals = computed(() => this.book()?.currency.decimals ?? 2);
  protected readonly entryId = computed(() => Number(this.params().get('entryId') ?? 0));
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  protected readonly party = computed(() => this.contacts().find((c) => c.id === this.contactId()) ?? null);
  protected readonly customers = computed(() => this.contacts().filter((c) => c.contactType === KHATA_CUSTOMER));
  protected readonly suppliers = computed(() => this.contacts().filter((c) => c.contactType !== KHATA_CUSTOMER));
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly placeholder = computed(() => '0' + (this.decimals() ? '.' + '0'.repeat(this.decimals()) : ''));
  /** Where Back and Cancel go: the entry's details when editing, the party's ledger when opened from it, else the dashboard. */
  protected readonly back = computed(() => {
    const id = this.bookId();
    if (this.entry())
      return `/khata/app/b/${id}/e/${this.entry()!.id}`;
    return this.query().get('contact') && this.contactId() ? `/khata/app/b/${id}/contact/${this.contactId()}` : `/khata/app/b/${id}`;
  });

  constructor() {
    effect(() => this.state.screen(this.i18n.t(this.entryId() ? 'khata.e.editTitle' : 'khata.ef.title')));
    effect(() => {
      const bookId = this.bookId();
      const entryId = this.entryId();
      untracked(() => void this.load(bookId, entryId));
    });
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.photos().forEach((p) => p.file && URL.revokeObjectURL(p.url));
  }

  drop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(false);
    if (ev.dataTransfer?.files.length)
      void this.addPhotos([...ev.dataTransfer.files]);
  }

  async save(): Promise<void> {
    if (this.busy())
      return;
    const minor = toMinor(this.amount(), this.decimals());
    const note = this.note().trim();
    const errors = { contact: !this.party(), amount: minor === null, date: !this.date() || this.date() > this.today, note: note.length > MAX_NOTE };
    this.invalid.set(errors);
    this.error.set('');
    if (Object.values(errors).some(Boolean)) {
      this.error.set(this.i18n.t(errors.amount ? 'khata.e.amountInvalid' : 'khata.ef.invalid'));
      setTimeout(() => document.querySelector<HTMLElement>('.k-entry [aria-invalid=true]')?.focus());
      return;
    }
    const request: KhataEntryRequest = { entryType: this.type(), amountMinor: minor!, entryDate: this.date(), note: note || undefined, rowVersion: this.entry()?.rowVersion };
    this.busy.set('save');
    try {
      const saved = await this.store(request);
      const photosSaved = await this.storePhotos(saved.id);
      this.ui.notify(this.i18n.t(!photosSaved ? 'khata.ph.saveFailed' : this.entry() ? 'khata.ef.updated' : 'khata.ef.saved'));
      void this.state.loadBooks().catch(() => null);
      const target = this.entry() || !photosSaved ? `/khata/app/b/${this.bookId()}/e/${saved.id}` : `/khata/app/b/${this.bookId()}/contact/${saved.contactId}`;
      this.busy.set(null);
      void this.router.navigateByUrl(target, { replaceUrl: true });
    } catch (e) {
      this.error.set((e as Error).message);
      this.busy.set(null);
    }
  }

  replace(index: number): void {
    this.replaceAt = index;
    this.replacer()?.nativeElement.click();
  }

  dragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(true);
  }

  viewPhoto(index: number): void {
    void this.ui.show(this.photos().map((p) => ({ name: p.name, url: p.url || null, attachmentId: p.file ? undefined : p.attachmentId })), index);
  }

  removePhoto(index: number): void {
    const [gone] = this.photos().slice(index, index + 1);
    this.photos.update((list) => list.filter((_, i) => i !== index));
    if (gone?.file)
      URL.revokeObjectURL(gone.url);
    else if (gone?.attachmentId)
      this.removed.push(gone.attachmentId);
    this.error.set('');
  }

  clearInvalid(field: string): void {
    if (this.invalid()[field])
      this.invalid.update((v) => ({ ...v, [field]: false }));
  }

  /** Stops an unsaved form with new photos from being lost by closing the tab. */
  leaving(ev: BeforeUnloadEvent): void {
    if (this.busy() || this.photos().some((p) => p.file))
      ev.preventDefault();
  }

  pick(kind: 'picker' | 'camera'): void {
    this.replaceAt = null;
    (kind === 'picker' ? this.picker() : this.camera())?.nativeElement.click();
  }

  picked(input: HTMLInputElement, replace: boolean): void {
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length)
      void this.addPhotos(replace ? files.slice(0, 1) : files, replace ? this.replaceAt : null);
  }

  // #endregion

  // #region Private Methods

  /** Removes the photos taken off the form, then uploads the new ones. False when a photo could not be saved (the entry itself is saved). */
  private async storePhotos(entryId: number): Promise<boolean> {
    try {
      for (const id of this.removed.splice(0)) {
        await this.api.deletePhoto(id);
        this.ui.forget(id);
      }
      const uploads = this.photos().filter((p) => p.file).map((p) => ({ blob: p.file!, name: p.name }));
      if (uploads.length)
        await this.api.uploadPhotos(entryId, uploads);
      return true;
    } catch {
      return false;
    }
  }

  private async prepare(file: File): Promise<KhataPhoto | null> {
    if (!PHOTO_TYPES.includes(file.type)) {
      this.error.set(this.i18n.t('khata.ph.badType', { name: file.name }));
      return null;
    }
    if (file.size > PHOTO_LIMITS.maxPickedBytes) {
      this.error.set(this.i18n.t('khata.ph.tooBig', { name: file.name, mb: this.maxPickedMb }));
      return null;
    }
    try {
      const blob = await compressPhoto(file);
      if (!blob || blob.size > PHOTO_LIMITS.maxPhotoBytes) {
        this.error.set(this.i18n.t('khata.ph.tooBig', { name: file.name, mb: PHOTO_LIMITS.maxPhotoBytes / 1048576 }));
        return null;
      }
      return { key: crypto.randomUUID(), file: blob, url: URL.createObjectURL(blob), name: photoName(file.name, blob), size: blob.size };
    } catch {
      this.error.set(this.i18n.t('khata.ph.unreadable', { name: file.name }));
      return null;
    }
  }

  private async load(bookId: number, entryId: number): Promise<void> {
    if (!bookId)
      return;
    this.ready.set(false);
    this.state.bookId.set(bookId);
    try {
      const [data, detail] = await Promise.all([this.api.contacts(bookId), entryId ? this.api.entry(entryId) : Promise.resolve(null)]);
      if (detail && detail.bookId !== bookId)
        throw Object.assign(new Error(this.i18n.t('khata.nf.lead')), { status: 404 });
      this.book.set(data.book);
      this.contacts.set(data.contacts);
      if (detail) {
        const e = detail.entry;
        this.entry.set(e);
        this.cantEdit.set(!e.addedByMe || e.isDeleted);
        this.type.set(e.entryType);
        this.contactId.set(e.contactId);
        this.amount.set(fromMinor(e.amountMinor, data.book.currency.decimals));
        this.date.set(e.entryDate);
        this.note.set(e.note ?? '');
        this.photos.set(detail.attachments.map((a) => ({ key: String(a.id), attachmentId: a.id, url: '', name: a.fileName, size: a.sizeBytes })));
        detail.attachments.forEach((a) => void this.ui.photoUrl(a.id).then((url) => url && this.photos.update((all) => all.map((p) => (p.attachmentId === a.id ? { ...p, url } : p)))));
      } else {
        const q = this.query();
        const contact = Number(q.get('contact') ?? 0);
        this.contactId.set(data.contacts.some((c) => c.id === contact) ? contact : 0);
        this.type.set(q.get('type') === String(KHATA_GOT) ? KHATA_GOT : KHATA_GAVE);
      }
      this.ready.set(true);
    } catch (e) {
      const err = e as Error & { status?: number };
      (err.status === 404 ? this.missing : this.loadError).set(err.message);
    }
  }

  /** The first save of a new entry sends the form's idempotency key, so a double tap or a retry never adds it twice. */
  private async store(request: KhataEntryRequest): Promise<KhataEntry> {
    const entry = this.entry();
    if (entry)
      return this.api.updateEntry(entry.id, request);
    return this.api.addEntry(this.contactId(), request, this.requestKey);
  }

  /** Checks, makes smaller and adds picked photos to the form (or puts one in the place of an existing photo). */
  private async addPhotos(files: File[], replaceAt: number | null = null): Promise<void> {
    if (this.busy())
      return;
    this.error.set('');
    let list = files;
    const room = this.maxPhotos - this.photos().length;
    if (replaceAt === null && list.length > room) {
      this.error.set(this.i18n.t('khata.ph.tooMany', { max: this.maxPhotos }));
      list = list.slice(0, Math.max(0, room));
    }
    if (!list.length)
      return;
    this.busy.set('photos');
    for (const f of list) {
      const photo = await this.prepare(f);
      if (!photo)
        continue;
      if (replaceAt !== null && this.photos()[replaceAt]) {
        this.removePhoto(replaceAt);
        this.photos.update((all) => [...all.slice(0, replaceAt), photo, ...all.slice(replaceAt)]);
      } else {
        this.photos.update((all) => [...all, photo]);
      }
    }
    this.busy.set(null);
  }

  // #endregion
}
