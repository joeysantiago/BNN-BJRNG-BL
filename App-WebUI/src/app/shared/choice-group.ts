import { ChoiceOption } from './models/choice.model';
import { Component, input, output } from '@angular/core';

/**
 * Pick one of a few options, as one row of buttons with the chosen one filled (the skin's primary colour). It is a group of real radio buttons, so arrow keys move
 * the choice, a form posts the value under `name`, and a screen reader hears one choice. Use it wherever one of a few options is picked; a long list stays a dropdown.
 * Icons are plain SVG paths, so the prerendered page draws them too. With iconOnly the names are not shown, but screen readers still read them and a tooltip shows them.
 */
@Component({
  selector: 'app-choice-group',
  templateUrl: './choice-group.html',
  styleUrl: './choice-group.scss',
})

export class ChoiceGroup {
  readonly disabled = input(false);
  /** Show only the icons; each name stays for screen readers and as the tooltip. */
  readonly iconOnly = input(false);
  readonly picked = output<string>();
  readonly name = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string | null>(null);
  readonly options = input.required<ChoiceOption[]>();
}
