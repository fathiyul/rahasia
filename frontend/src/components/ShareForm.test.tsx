import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ShareForm } from './ShareForm'

describe('ShareForm', () => {
  it('submits text share values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ShareForm isSubmitting={false} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/secret content/i), 'hello from test')
    await user.click(screen.getByRole('button', { name: /create share/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'text',
      content: 'hello from test',
      file: null,
      expires_in: 3600,
      burn_after_read: false,
    })
  })

  it('switches to file mode and submits the selected file', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ShareForm isSubmitting={false} onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByLabelText(/share type/i), 'file')

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    const fileInput = screen.getByLabelText(/^file$/i)
    const submitButton = screen.getByRole('button', { name: /create share/i })

    await user.upload(fileInput, file)

    expect(submitButton).not.toBeDisabled()

    fireEvent.submit(submitButton.closest('form')!)

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'file',
      content: '',
      file,
      expires_in: 3600,
      burn_after_read: false,
    })
  })
})
