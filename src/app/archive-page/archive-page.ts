import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  type Signal,
  signal,
  inject,
  effect,
  viewChild,
  untracked,
} from '@angular/core';
import type {
  ArchiveQueryChanges,
  CaseCategory,
  IncidentCase,
  ThreatLevel,
} from '../cases/case.model';
import { CasesApi } from '../cases/cases-api';
import type { CaseDeletionResult } from '../cases/case-deletion.model';
import { ArchiveReset } from './archive-reset';
import { CaseFilters } from '../case-filters/case-filters';
import { CaseDetails } from '../case-details/case-details';
import { CaseCard } from '../case-card/case-card';
import { CaseNotFound } from '../case-not-found/case-not-found';
import { CasesEmpty } from '../cases-empty/cases-empty';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type {
  CaseCategoryFilter,
  CaseStatusFilter,
  ThreatLevelFilter,
} from '../case-filters/case-filters.model';
import { ActivatedRoute, Router } from '@angular/router';
import type { CaseStatus } from '../cases/case.model';
import {
  isValidCategory,
  isValidStatus,
  isValidThreatLevel,
  isValidRegion,
  getInvalidQueryParams,
} from './archive-query-params';
import { filterCases } from './archive-filtering';
import { AuthService } from '../auth/auth.service';
import type { AuthState } from '../auth/auth.model';
import { LoginDialog } from '../auth/login-dialog/login-dialog';

@Component({
  imports: [CaseCard, CaseDetails, CaseFilters, CaseNotFound, CasesEmpty, LoginDialog],
  selector: 'app-archive-page',
  styleUrl: './archive-page.css',
  templateUrl: './archive-page.html',
})
export class ArchivePage {
  constructor() {
    this.loadCases();
    effect(() => {
      const state = this.auth.state();
      if (this.checkingSession()) {
        untracked(() => this.resolveNewCaseRequest(state));
      }
    });
    effect(() => {
      this.archiveReset.version();
      this.searchQuery.set('');
    });
    effect(() => {
      if (this.loadState() !== 'loaded') return;
      const invalidQueryParams = getInvalidQueryParams(this.queryParams(), this.regions());

      if (Object.keys(invalidQueryParams).length) {
        this.router.navigate([], {
          queryParams: {
            ...invalidQueryParams,
          },
          queryParamsHandling: 'merge',
        });
      }
    });
    effect(() => {
      if (this.loadState() !== 'loaded') return;
      const currentCaseId = this.routeParams().get('caseId');
      if (
        currentCaseId &&
        this.cases().some((item) => item.id === currentCaseId) &&
        !this.filteredCases().some((item) => item.id === currentCaseId)
      ) {
        this.router.navigate(['/'], {
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  private readonly archiveReset = inject(ArchiveReset);
  protected readonly auth = inject(AuthService);
  private readonly loginDialog = viewChild.required(LoginDialog);
  private newCaseTrigger: HTMLButtonElement | undefined;
  protected readonly checkingSession = signal(false);
  protected readonly accessMessage = signal<string | null>(null);
  private readonly router = inject(Router);
  private readonly api = inject(CasesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly archiveTitle = viewChild<ElementRef<HTMLHeadingElement>>('archiveTitle');

  private readonly route = inject(ActivatedRoute);

  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly cases = signal<readonly IncidentCase[]>([]);
  protected readonly deletionMessage = signal<string | null>(null);
  // Сохраняем выбранный регион, даже если удалено последнее дело этого региона.
  private readonly retainedRegions = signal<readonly string[]>([]);
  protected readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');

  protected readonly regions = computed(() => [
    ...new Set([
      ...this.retainedRegions(),
      ...this.cases()
        .map((incident) => incident.location?.region)
        .filter((region) => region !== null && region !== undefined),
    ]),
  ]);

  protected readonly routeCaseId = computed(() => this.routeParams().get('caseId'));

  protected readonly searchQuery = signal('');

  protected readonly statusFilter = computed(() => {
    const status = this.queryParams().get('status');
    if (!status) return 'all';
    if (isValidStatus(status)) return status as CaseStatus;
    else return 'all';
  });

  protected readonly categoryFilter = computed(() => {
    const category = this.queryParams().get('category');
    if (!category) return 'all';
    if (isValidCategory(category)) return category as CaseCategory;
    else return 'all';
  });

  protected readonly threatLevelFilter = computed(() => {
    const threatLevel = this.queryParams().get('threatLevel');
    if (!threatLevel) return 'all';
    if (threatLevel === 'unrated') return null;
    if (isValidThreatLevel(threatLevel)) return Number(threatLevel) as ThreatLevel;
    else return 'all';
  });

  protected readonly regionFilter = computed(() => {
    const region = this.queryParams().get('region');
    if (!region) return 'all';
    if (isValidRegion(region, this.regions())) return region;
    else return 'all';
  });

  protected readonly filteredCases = computed(() => {
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const threatLevel = this.threatLevelFilter();
    const region = this.regionFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return filterCases(status, category, threatLevel, region, query, this.cases());
  });

  protected readonly selectedCase: Signal<IncidentCase | null> = computed(() => {
    const caseId = this.routeCaseId();
    return this.filteredCases().find((item) => item.id === caseId) ?? null;
  });

  protected readonly isCaseNotFound = computed(() => {
    const currentId = this.routeCaseId();
    return (
      this.loadState() === 'loaded' &&
      currentId !== null &&
      !this.cases().some((item) => item.id === currentId)
    );
  });

  private loadCases(): void {
    this.loadState.set('loading');
    this.api
      .getCases()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cases) => {
          this.cases.set(cases);
          this.loadState.set('loaded');
        },
        error: () => this.loadState.set('error'),
      });
  }

  protected retryLoad(): void {
    this.archiveTitle()?.nativeElement.focus();
    this.loadCases();
  }

  protected async handleCaseDeleted(result: CaseDeletionResult): Promise<void> {
    const region = this.regionFilter();
    if (region !== 'all')
      this.retainedRegions.update((regions) => [...new Set([...regions, region])]);
    this.cases.update((cases) =>
      cases
        .filter((incident) => incident.id !== result.id)
        .map((incident) => ({
          ...incident,
          relatedCaseIds: incident.relatedCaseIds.filter((id) => id !== result.id),
        })),
    );
    this.deletionMessage.set(
      result.alreadyAbsent
        ? 'Дело уже отсутствует в архиве. Статус очистки фотографии не подтверждён.'
        : result.photoCleanup === 'pending'
          ? 'Дело удалено. Очистка фотографии ожидается и будет повторяться автоматически при работающем API.'
          : 'Дело удалено.',
    );
    await this.router.navigate(['/'], { queryParamsHandling: 'preserve', replaceUrl: true });
    this.archiveTitle()?.nativeElement.focus();
  }

  protected requestNewCase(trigger: HTMLButtonElement): void {
    if (this.checkingSession()) return;
    this.newCaseTrigger = trigger;
    this.accessMessage.set(null);
    this.checkingSession.set(true);
  }

  protected retrySessionCheck(): void {
    this.accessMessage.set(null);
    this.auth.checkSession();
    this.checkingSession.set(true);
  }

  private resolveNewCaseRequest(state: AuthState): void {
    switch (state.status) {
      case 'idle':
        this.auth.checkSession();
        return;
      case 'loading':
        return;
      case 'error':
        this.accessMessage.set(
          'Не удалось проверить служебный допуск. Проверьте соединение и повторите проверку.',
        );
        break;
      case 'unauthenticated':
        if (this.newCaseTrigger) this.loginDialog().open(this.newCaseTrigger);
        break;
      case 'authenticated':
        this.openCreationForAdmin(state.user.role);
        break;
    }
    this.checkingSession.set(false);
  }

  protected handleLoggedIn(): void {
    this.loginDialog().close();
    const state = this.auth.state();
    if (state.status === 'authenticated') this.openCreationForAdmin(state.user.role);
  }

  private openCreationForAdmin(role: string): void {
    if (role === 'admin') {
      void this.router.navigate(['/cases/new']);
    } else {
      this.accessMessage.set(
        'Создавать дела может только администратор. У вашей учётной записи нет необходимого допуска.',
      );
    }
  }

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  updateQueryParams(change: ArchiveQueryChanges) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: change,
      queryParamsHandling: 'merge',
    });
  }

  handleCaseSelected(caseId: string) {
    this.router.navigate(['/cases', caseId], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  updateStatusFilter(status: CaseStatusFilter): void {
    this.updateQueryParams({ status: status === 'all' ? null : status });
  }

  updateCategoryFilter(category: CaseCategoryFilter): void {
    this.updateQueryParams({ category: category === 'all' ? null : category });
  }

  updateThreatLevelFilter(threatLevel: ThreatLevelFilter): void {
    let levelParam: ThreatLevel | 'unrated' | null;
    if (threatLevel === 'all') levelParam = null;
    else if (threatLevel === null) levelParam = 'unrated';
    else levelParam = threatLevel;
    this.updateQueryParams({ threatLevel: levelParam });
  }

  updateRegionFilter(region: string): void {
    this.updateQueryParams({ region: region === 'all' ? null : region });
  }

  resetFilters() {
    this.updateQueryParams({ status: null, category: null, threatLevel: null, region: null });
  }

  resetSearchAndFilters(): void {
    this.searchQuery.set('');
    this.resetFilters();
  }
}
