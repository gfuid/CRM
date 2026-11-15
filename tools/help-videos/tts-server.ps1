# Text-to-speech worker for the help videos (Windows built-in voice, works offline).
# Reads lines "outputPath<TAB>text" from stdin, writes a 16-bit mono WAV, and prints "ok <path>" (or "err <message>").
param([string]$Voice = 'Microsoft Zira Desktop', [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $synth.SelectVoice($Voice) } catch { }
$synth.Rate = $Rate
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
[Console]::Out.WriteLine('ready')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line -or $line -eq 'quit') { break }
  $parts = $line.Split("`t", 2)
  try {
    $synth.SetOutputToWaveFile($parts[0], $format)
    $synth.Speak($parts[1])
    $synth.SetOutputToNull()
    [Console]::Out.WriteLine("ok $($parts[0])")
  } catch {
    [Console]::Out.WriteLine("err $($_.Exception.Message)")
  }
}
$synth.Dispose()
