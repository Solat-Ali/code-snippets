import { Directive, ElementRef, Input, Renderer2, OnDestroy, AfterViewInit, ViewContainerRef } from '@angular/core';
import { NzSkeletonElementImageComponent } from 'ng-zorro-antd/skeleton';

/**
 * @directive LazyLoadImgDirective
 *
 * Provides lazy loading for images and background images with responsive support based on viewport size.
 * Uses Intersection Observer to load the resource when the element enters the viewport.
 *
 * @inputs
 * - `collabLazyLoad: string` - The fallback image or background URL.
 * - `isBgImg: boolean` - If `true`, applies the image as a background (`background-image`).
 * - `lazySrcSet: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl', string>>` -
 *   (Optional) URLs for specific breakpoints. If not provided, `collabLazyLoad` is used as the default.
 *
 * @breakpoints
 * - If only specific breakpoints (e.g., `xs` and `lg`) are defined:
 *   - `xs` applies to screen sizes up to `md`.
 *   - `lg` applies from `lg` and covers up to `xxl`.
 *   - The behavior follows Bootstrap-like breakpoint rules.
 *
 * @usage
 * ### For `<img>`:
 * ```html
 * <img
 *   collabLazyLoad="default.jpg"
 *   [lazySrcSet]="{ xs: 'small.jpg', lg: 'large.jpg' }"
 *   alt="Lazy loaded image"
 * />
 * ```
 *
 * ### For Background Images:
 * ```html
 * <div
 *   collabLazyLoad="default-bg.jpg"
 *   [lazySrcSet]="{ xs: 'small-bg.jpg', lg: 'large-bg.jpg' }"
 *   [isBgImg]="true"
 *   style="height: 300px; width: 100%; background-size: cover;">
 * </div>
 * ```
 */

const BREAKPOINTS = {
    xxl: 1920,
    xl: 1280,
    lg: 1024,
    md: 768,
    sm: 576,
    xs: 0,
};

interface SrcSet {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    xxl?: string;
}

@Directive({
    selector: '[collabLazyLoad]',
    standalone: true,
})
export class LazyLoadImgDirective implements AfterViewInit, OnDestroy {
    @Input() collabLazyLoad!: string;
    @Input() isBgImg = false;
    @Input() lazySrcSet: Partial<SrcSet> = {};

    private observer!: IntersectionObserver;

    constructor(
        private el: ElementRef<HTMLImageElement | HTMLElement>,
        private renderer: Renderer2,
        private viewContainerRef: ViewContainerRef,
    ) {}

    ngAfterViewInit(): void {
        this.insertPlaceholders();
        this.initializeObserver();
    }

    insertPlaceholders() {
        if (!this.isBgImg) {
            this.addImgPlaceholder();
        } else {
            this.addBgImgPlaceholder();
        }
    }

    initializeObserver() {
        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                const url = this.getResolutionSpecificURL();

                if (this.isBgImg) {
                    this.loadBgImg(url);
                } else {
                    this.loadImg(url);
                }

                this.observer.unobserve(this.el.nativeElement);
            }
        });

        this.observer.observe(this.el.nativeElement);
    }

    ngOnDestroy(): void {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    private getResolutionSpecificURL(): string {
        const width = window.innerWidth;

        for (const [key, min] of Object.entries(BREAKPOINTS)) {
            if (width >= min && this.lazySrcSet[key as keyof SrcSet]) {
                return this.lazySrcSet[key as keyof SrcSet]!;
            }
        }

        return this.collabLazyLoad;
    }

    // #region Lazy Load Images
    private loadImg(url: string): void {
        const target = this.el.nativeElement as HTMLImageElement;
        this.renderer.setAttribute(target, 'src', url);

        target.addEventListener('load', () => {
            this.toggleShowImg(true);
            this.removeImgPlaceholder();
        });
    }

    private addImgPlaceholder(): void {
        const compRef = this.viewContainerRef.createComponent(NzSkeletonElementImageComponent);
        const skeletonEl = compRef.location.nativeElement;
        const skeletonClass = 'ant-skeleton';

        this.renderer.addClass(skeletonEl, skeletonClass);
        this.renderer.addClass(skeletonEl, `${skeletonClass}-active`);
        this.renderer.addClass(skeletonEl, `${skeletonClass}-element`);

        this.toggleShowImg(false);
    }

    private removeImgPlaceholder(): void {
        const skeletonComp = this.viewContainerRef.get(0);
        skeletonComp?.destroy();
    }

    private toggleShowImg(show: boolean): void {
        const target = this.el.nativeElement as HTMLImageElement;

        if (show) {
            this.renderer.removeStyle(target, 'visibility');
            this.renderer.removeStyle(target, 'position');
            this.removeImgPlaceholder();
        } else {
            this.renderer.setStyle(target, 'visibility', 'hidden');
            this.renderer.setStyle(target, 'position', 'absolute');
        }
    }
    // #endregion

    // #region Lazy Load Background Images
    private addBgImgPlaceholder(): void {
        const compRef = this.viewContainerRef.createComponent(NzSkeletonElementImageComponent);
        const skeletonEl = compRef.location.nativeElement;

        const skeletonClass = 'ant-skeleton';
        this.renderer.addClass(skeletonEl, skeletonClass);
        this.renderer.addClass(skeletonEl, `${skeletonClass}-active`);
        this.renderer.addClass(skeletonEl, `${skeletonClass}-element`);

        this.renderer.appendChild(this.el.nativeElement, skeletonEl);
    }

    private removeBgImgPlaceholder(): void {
        const skeletonEl = this.el.nativeElement.querySelector('.ant-skeleton');
        if (skeletonEl) {
            this.renderer.removeChild(this.el.nativeElement, skeletonEl);
        }
    }

    private loadBgImg(url: string): void {
        const sanitizedUrl = url.replace(/'/g, '');

        fetch(sanitizedUrl)
            .then((response) => response.blob())
            .then((blob) => {
                const reader = new FileReader();

                reader.onloadend = () => {
                    const base64Image = reader.result as string;
                    this.renderer.setStyle(this.el.nativeElement, 'backgroundImage', `url(${base64Image})`);
                    this.removeBgImgPlaceholder();
                };

                reader.readAsDataURL(blob);
            });
    }

    // #endregion
}
