/**
 * MiCha Share Extension for iOS
 * Handles shared content from other apps
 */

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    
    private let appGroupIdentifier = "group.com.micha.app"
    private let sharedDefaults = UserDefaults(suiteName: "group.com.micha.app")
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        processSharedContent()
    }
    
    private func setupUI() {
        view.backgroundColor = UIColor.systemBackground
        
        // Add loading indicator
        let activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.center = view.center
        activityIndicator.startAnimating()
        view.addSubview(activityIndicator)
        
        // Add MiCha branding
        let logoImageView = UIImageView(image: UIImage(named: "MiChaLogo"))
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(logoImageView)
        
        NSLayoutConstraint.activate([
            logoImageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoImageView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            logoImageView.widthAnchor.constraint(equalToConstant: 100),
            logoImageView.heightAnchor.constraint(equalToConstant: 100)
        ])
    }
    
    private func processSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            cancel()
            return
        }
        
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                handleURL(from: attachment)
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                handleText(from: attachment)
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                handleImage(from: attachment)
            }
        }
    }
    
    private func handleURL(from attachment: NSItemProvider) {
        attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
            guard let url = item as? URL else {
                self?.cancel()
                return
            }
            
            self?.saveSharedContent(SharedContent(
                type: .url,
                content: url.absoluteString,
                timestamp: Date()
            ))
            
            self?.openMainApp()
        }
    }
    
    private func handleText(from attachment: NSItemProvider) {
        attachment.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { [weak self] (item, error) in
            guard let text = item as? String else {
                self?.cancel()
                return
            }
            
            self?.saveSharedContent(SharedContent(
                type: .text,
                content: text,
                timestamp: Date()
            ))
            
            self?.openMainApp()
        }
    }
    
    private func handleImage(from attachment: NSItemProvider) {
        attachment.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
            guard let image = item as? UIImage,
                  let imageData = image.jpegData(compressionQuality: 0.8) else {
                self?.cancel()
                return
            }
            
            // Save image to shared container
            let fileName = "shared_image_\(Date().timeIntervalSince1970).jpg"
            let fileURL = self?.getSharedFileURL(fileName: fileName)
            
            do {
                try imageData.write(to: fileURL!)
                
                self?.saveSharedContent(SharedContent(
                    type: .image,
                    content: fileURL!.absoluteString,
                    timestamp: Date()
                ))
                
                self?.openMainApp()
            } catch {
                print("Failed to save image: \(error)")
                self?.cancel()
            }
        }
    }
    
    private func saveSharedContent(_ content: SharedContent) {
        // Save to shared UserDefaults
        if let encoded = try? JSONEncoder().encode(content) {
            sharedDefaults?.set(encoded, forKey: "pendingSharedContent")
        }
    }
    
    private func getSharedFileURL(fileName: String) -> URL? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupIdentifier
        ) else { return nil }
        
        let sharedDirectory = containerURL.appendingPathComponent("SharedFiles")
        
        // Create directory if it doesn't exist
        try? FileManager.default.createDirectory(
            at: sharedDirectory,
            withIntermediateDirectories: true,
            attributes: nil
        )
        
        return sharedDirectory.appendingPathComponent(fileName)
    }
    
    private func openMainApp() {
        // Create URL scheme to open main app
        let urlString = "micha://share"
        guard let url = URL(string: urlString) else {
            cancel()
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            // This will open the main app
            self?.extensionContext?.completeRequest(returningItems: nil) { _ in
                // Use responder chain to open URL
                let responder = self?.responder(of: UIApplication.self)
                responder?.perform(#selector(UIApplication.open(_:options:completionHandler:)),
                                   with: url,
                                   with: [:],
                                   with: nil)
            }
        }
    }
    
    private func cancel() {
        extensionContext?.cancelRequest(withError: NSError(
            domain: "com.micha.share",
            code: 0,
            userInfo: nil
        ))
    }
    
    private func responder<T>(of type: T.Type) -> T? {
        var responder: UIResponder? = self
        while responder != nil {
            if let typed = responder as? T {
                return typed
            }
            responder = responder?.next
        }
        return nil
    }
}

// MARK: - Data Models

struct SharedContent: Codable {
    enum ContentType: String, Codable {
        case url
        case text
        case image
    }
    
    let type: ContentType
    let content: String
    let timestamp: Date
}

// MARK: - Extensions

extension UIViewController {
    var extensionContext: NSExtensionContext? {
        return self.extensionContext
    }
}