import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Seating } from './seating';

describe('Seating', () => {
  let component: Seating;
  let fixture: ComponentFixture<Seating>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Seating]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Seating);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
