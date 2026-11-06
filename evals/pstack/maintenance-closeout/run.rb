#!/usr/bin/env ruby
# The command reads a prompt on stdin. Keep model outputs outside the repository.
require 'json'
require 'fileutils'
require 'open3'
require 'tmpdir'

skill, output, *command = ARGV
abort 'usage: ruby run.rb SKILL.md OUTPUT_DIR COMMAND [ARG ...]' unless skill && output && !command.empty?
FileUtils.mkdir_p(output)
cases = JSON.parse(File.read(File.join(__dir__, 'cases.json')))
failed = []
Dir.mktmpdir('orders-') do |workspace|
  _, error, initialized = Open3.capture3('git', 'init', '--quiet', workspace)
  abort error unless initialized.success?
  cases.each do |entry|
    prompt = <<~PROMPT
      Use the supplied maintenance procedure for this request. Earlier steps were
      completed as recorded in the run note. Respond with the closeout and next
      action only; no tools are available in this continuation.

      <procedure>
      #{File.read(skill)}
      </procedure>
      <request>
      #{entry.fetch('request')}
      </request>
      <run-note>
      #{entry.fetch('state')}
      </run-note>
    PROMPT
    stdout, stderr, status = Open3.capture3(*command, stdin_data: prompt, chdir: workspace)
    File.write(File.join(output, "#{entry.fetch('id')}.json"), JSON.pretty_generate(
      'prompt' => prompt, 'stdout' => stdout, 'stderr' => stderr,
      'exit_status' => status.exitstatus
    ) + "\n")
    unless status.success?
      failed << entry.fetch('id')
      warn "#{entry.fetch('id')}: command failed; inspect retained output"
      next
    end
    puts "#{entry.fetch('id')}: response captured (not graded)"
  end
end
abort "Failed cases: #{failed.join(', ')}" unless failed.empty?
