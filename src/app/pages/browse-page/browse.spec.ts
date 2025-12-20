import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowseEventPage } from './browse';

describe('BrowseEventPage', () => {
  let component: BrowseEventPage;
  let fixture: ComponentFixture<BrowseEventPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseEventPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowseEventPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
