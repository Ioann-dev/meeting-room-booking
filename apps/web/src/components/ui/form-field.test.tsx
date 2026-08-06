import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Input } from './input';
import { FormField } from './form-field';

describe('FormField focus-on-error', () => {
  it('does not steal focus when it renders with no error', () => {
    render(
      <FormField label="Name">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText('Name')).not.toHaveFocus();
  });

  it('moves focus to the field once a validation error appears', () => {
    function Harness() {
      const [error, setError] = useState<string | undefined>();
      return (
        <>
          <button type="button" onClick={() => setError('Required')}>
            Trigger error
          </button>
          <FormField label="Name" error={error}>
            <Input />
          </FormField>
        </>
      );
    }
    render(<Harness />);

    expect(screen.getByLabelText('Name')).not.toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Trigger error' }));
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('focuses only the first invalid field when several appear at once', () => {
    function Harness() {
      const [showErrors, setShowErrors] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setShowErrors(true)}>
            Submit
          </button>
          <FormField label="First" error={showErrors ? 'Required' : undefined}>
            <Input />
          </FormField>
          <FormField label="Second" error={showErrors ? 'Required' : undefined}>
            <Input />
          </FormField>
        </>
      );
    }
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByLabelText('First')).toHaveFocus();
    expect(screen.getByLabelText('Second')).not.toHaveFocus();
  });
});
