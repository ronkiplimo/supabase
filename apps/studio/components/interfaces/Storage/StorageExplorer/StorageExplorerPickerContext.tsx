import { createContext, useContext, type PropsWithChildren } from 'react'

export type StoragePickerReturnValue = 'objectPath' | 'publicUrl'

type StorageExplorerPickerContextValue = {
  isPicker: true
  returnValue: StoragePickerReturnValue
  onPick: (value: string) => void
  /** When true, hide column view and related chrome (e.g. mobile sheet). */
  forceListView: boolean
}

const StorageExplorerPickerContext = createContext<StorageExplorerPickerContextValue | null>(null)

export function StorageExplorerPickerProvider({
  children,
  returnValue,
  onPick,
  forceListView,
}: PropsWithChildren<
  Pick<StorageExplorerPickerContextValue, 'returnValue' | 'onPick' | 'forceListView'>
>) {
  const value: StorageExplorerPickerContextValue = {
    isPicker: true,
    returnValue,
    onPick,
    forceListView,
  }
  return (
    <StorageExplorerPickerContext.Provider value={value}>{children}</StorageExplorerPickerContext.Provider>
  )
}

export function useStorageExplorerPicker() {
  return useContext(StorageExplorerPickerContext)
}
